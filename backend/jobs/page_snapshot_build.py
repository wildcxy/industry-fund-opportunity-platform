import os
import re
from datetime import date

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from config.settings import get_settings
from db.connection import get_connection
from db.queries.funds import normalize_aum_yi
from jobs.shared import build_batch_id, log_job_end, log_job_start, resolve_trade_date


FALLBACK_DATA_VERSION = "manual-drop-v1"
AUTO_TOP10_DATA_VERSION = "tushare-industry-top10-v1"


def resolve_industry_data_context(cur, requested_trade_date) -> tuple[date, str]:
    configured = get_settings().active_data_version
    version_filter = "and data_version = %s" if configured and configured != "latest" else ""
    params = (requested_trade_date, configured) if version_filter else (requested_trade_date,)
    cur.execute(
        f"""
        select trade_date, data_version
        from industry_opportunity_daily
        where trade_date <= %s
        {version_filter}
        group by trade_date, data_version
        order by trade_date desc, max(updated_at) desc
        limit 1
        """,
        params,
    )
    row = cur.fetchone()
    if row:
        return row["trade_date"], row["data_version"]
    return requested_trade_date, configured if configured and configured != "latest" else FALLBACK_DATA_VERSION


def build_risk_hint(risk_level: str | None) -> str:
    if risk_level == "高":
        return "高"
    if risk_level == "低":
        return "低"
    return "中"


def methodology_notes() -> list[dict[str, str]]:
    return [
        {"title": "趋势强度口径", "content": "参考近 20 日、60 日与 120 日代理动量，并加入回撤、波动和短期过热惩罚。"},
        {"title": "资金强度口径", "content": "参考成交活跃度与资金热度代理指标。"},
        {"title": "估值与风险口径", "content": "估值位置用于判断性价比，风险提示关注拥挤度与波动。"},
        {"title": "策略边界", "content": "趋势策略用于观察优先级与复盘提示，不直接输出买卖指令；QDII 与新发基金可能存在披露延迟或历史样本不足。"},
    ]


def fund_rank_score(fund: dict) -> float:
    return_1m = float(fund["return_1m"] or 0)
    return_3m = float(fund["return_3m"] or 0)
    return_6m = float(fund["return_6m"] or 0)
    max_drawdown = float(fund["max_drawdown"] or 0)
    volatility = float(fund["volatility"] or 0)
    age = float(fund["founded_years"] or 0)
    score = (
        max(0, min(100, (return_3m + 15) / 45 * 100)) * 0.30
        + max(0, min(100, (return_1m + 8) / 26 * 100)) * 0.16
        + max(0, min(100, (return_6m + 20) / 65 * 100)) * 0.14
        + max(0, min(100, 100 + max_drawdown * 3)) * 0.18
        + max(0, min(100, 100 - max(volatility - 12, 0) * 2.8)) * 0.12
        + max(0, min(100, age / 5 * 100)) * 0.10
    )
    return round(score, 2)


def fund_rank_signal(score: float, fund: dict) -> str:
    return_1m = float(fund["return_1m"] or 0)
    max_drawdown = float(fund["max_drawdown"] or 0)
    if max_drawdown <= -25:
        return "高回撤观察"
    if return_1m >= 18:
        return "短期强势不追高"
    if score >= 75:
        return "优先观察"
    if score >= 65:
        return "分批配置观察"
    if score >= 55:
        return "继续跟踪"
    return "数据或趋势待验证"


def metric_score(value: float | None, low: float, high: float, missing: float = 45.0) -> float:
    if value is None:
        return missing
    return max(0.0, min(100.0, (value - low) / (high - low) * 100.0))


def average_metric(funds: list[dict], key: str) -> float | None:
    values = [float(fund[key]) for fund in funds if fund.get(key) is not None]
    if not values:
        return None
    return round(sum(values) / len(values), 4)


def worst_drawdown(funds: list[dict]) -> float | None:
    values = [float(fund["max_drawdown"]) for fund in funds if fund.get("max_drawdown") is not None]
    if not values:
        return None
    return round(min(values), 4)


def strategy_signal(strategy_score: float, return_20d: float | None, return_60d: float | None, max_drawdown: float | None, overheat_risk: float) -> str:
    if return_20d is None and return_60d is None:
        return "数据不足"
    if overheat_risk >= 70:
        return "短期过热"
    if max_drawdown is not None and max_drawdown <= -25:
        return "高回撤修复"
    if (return_20d or 0) < -6 and (return_60d or 0) < 0:
        return "趋势转弱"
    if strategy_score >= 72:
        return "趋势确认"
    if strategy_score >= 58:
        return "震荡偏强"
    return "继续验证"


def strategy_hint(signal: str, industry_name: str) -> str:
    mapping = {
        "趋势确认": f"{industry_name}中期动量较强且风险尚可控，适合放入重点观察池，等待回调或分批节奏验证。",
        "短期过热": f"{industry_name}短期涨幅较快，容易出现回撤或震荡，适合先看回撤承接，不宜单纯追涨。",
        "高回撤修复": f"{industry_name}仍处在高波动修复阶段，需要先确认趋势是否重新站稳，再评估仓位节奏。",
        "趋势转弱": f"{industry_name}短中期动量同步转弱，持仓需要复盘趋势是否破坏，避免只因低位而忽视继续下行风险。",
        "震荡偏强": f"{industry_name}有一定中期动量，但波动和回撤仍需观察，适合用小仓位或观察池跟踪。",
        "继续验证": f"{industry_name}趋势证据还不够强，适合继续跟踪，不急于提高观察优先级。",
        "数据不足": f"{industry_name}样本数据不足，暂不做趋势强弱判断，需先补齐净值和行业指数历史数据。",
    }
    return mapping.get(signal, mapping["继续验证"])


def build_trend_strategy(row: dict, related_funds: list[dict]) -> dict:
    return_20d = float(row["performance_20d"]) if row.get("performance_20d") is not None else average_metric(related_funds, "return_1m")
    return_60d = float(row["performance_60d"]) if row.get("performance_60d") is not None else average_metric(related_funds, "return_3m")
    return_120d = average_metric(related_funds, "return_6m")
    max_drawdown = worst_drawdown(related_funds)
    volatility = average_metric(related_funds, "volatility")

    momentum_score = (
        metric_score(return_20d, -8.0, 18.0) * 0.25
        + metric_score(return_60d, -15.0, 30.0) * 0.45
        + metric_score(return_120d, -20.0, 45.0) * 0.30
    )
    drawdown_score = 45.0 if max_drawdown is None else max(0.0, min(100.0, 100.0 + max_drawdown * 3.0))
    volatility_score = 45.0 if volatility is None else max(0.0, min(100.0, 100.0 - max(volatility - 12.0, 0.0) * 2.8))
    trend_quality_score = 50.0
    if return_20d is not None and return_60d is not None and return_120d is not None:
        aligned_count = sum(1 for value in (return_20d, return_60d, return_120d) if value > 0)
        if return_20d > return_60d > return_120d > 0:
            trend_quality_score = 72.0
        elif aligned_count == 3:
            trend_quality_score = 82.0
        elif aligned_count == 2:
            trend_quality_score = 62.0
        elif aligned_count == 0:
            trend_quality_score = 25.0

    overheat_risk = 0.0
    if return_20d is not None:
        overheat_risk += max(0.0, min(60.0, (return_20d - 10.0) * 5.0))
    if return_60d is not None and return_20d is not None and return_60d > 0:
        overheat_risk += max(0.0, min(25.0, (return_20d / max(abs(return_60d), 1.0) - 0.55) * 50.0))
    if volatility is not None and volatility >= 32:
        overheat_risk += min(15.0, (volatility - 32.0) * 1.5)
    overheat_risk = round(max(0.0, min(100.0, overheat_risk)), 2)

    strategy_score = (
        momentum_score * 0.40
        + drawdown_score * 0.25
        + volatility_score * 0.15
        + trend_quality_score * 0.10
        + (100.0 - overheat_risk) * 0.10
    )
    signal = strategy_signal(strategy_score, return_20d, return_60d, max_drawdown, overheat_risk)

    return {
        "strategyScore": round(max(0.0, min(100.0, strategy_score)), 2),
        "signal": signal,
        "momentumScore": round(momentum_score, 2),
        "drawdownControlScore": round(drawdown_score, 2),
        "volatilityControlScore": round(volatility_score, 2),
        "trendQualityScore": round(trend_quality_score, 2),
        "overheatRiskScore": overheat_risk,
        "return20d": round(return_20d, 4) if return_20d is not None else None,
        "return60d": round(return_60d, 4) if return_60d is not None else None,
        "return120dProxy": round(return_120d, 4) if return_120d is not None else None,
        "maxDrawdownProxy": max_drawdown,
        "volatilityProxy": round(volatility, 4) if volatility is not None else None,
        "hint": strategy_hint(signal, row["industry_name"]),
        "riskControlHint": "先看趋势是否延续，再看回撤是否可控；短期过热或波动放大时，优先降低追涨冲动而不是机械加仓。",
        "methodology": "区间收益用净值首尾比，不做简单日收益相加；波动率用日对数收益率估算。动量分=20日25%+60日45%+120日代理30%；总分=动量40%+回撤控制25%+波动控制15%+趋势质量10%+过热惩罚10%。",
    }


def build_fund_payload(fund: dict, score: float, signal: str, tags: list[str]) -> dict:
    aum = normalize_aum_yi(fund["aum"])
    missing_metrics = []
    if aum is None:
        missing_metrics.append("aum")
    payload = {
        "fundId": fund["fund_id"],
        "fundName": fund["fund_name"],
        "fundCode": fund["fund_code"],
        "fundType": fund["fund_type"],
        "theme": fund["theme"],
        "trackingTarget": fund["tracking_target"],
        "return1d": float(fund["return_1d"] or 0),
        "return1m": float(fund["return_1m"] or 0),
        "return3m": float(fund["return_3m"] or 0),
        "return6m": float(fund["return_6m"] or 0),
        "maxDrawdown": float(fund["max_drawdown"] or 0),
        "volatility": float(fund["volatility"] or 0),
        "aum": aum or 0,
        "feeRate": float(fund["fee_rate"] or 0),
        "tradableOnExchange": fund["tradable_on_exchange"],
        "tags": tags,
        "foundedYears": fund["founded_years"],
        "fundCompany": fund["fund_company"],
        "rankingScore": score,
        "rankingSignal": signal,
        "missingMetrics": missing_metrics,
        "dataCompleteness": "partial" if missing_metrics else "complete",
    }
    if fund.get("is_held"):
        payload.update(
            {
                "isHeld": True,
                "marketValueSnapshot": float(fund["market_value_snapshot"] or 0),
                "holdingReturnSnapshot": float(fund["holding_return_snapshot"] or 0),
            }
        )
    return payload


STRUCTURAL_GROWTH_KEYWORDS = (
    "AI",
    "人工智能",
    "算力",
    "CPO",
    "云计算",
    "半导体",
    "芯片",
    "存储",
    "机器人",
)

MEAN_REVERSION_KEYWORDS = (
    "白酒",
    "酒",
    "消费",
    "食品饮料",
    "地产",
)

LONG_HOLD_KEYWORDS = (
    "QDII",
    "全球",
    "海外",
    "美股",
    "纳斯达克",
    "标普",
    "亚洲",
    "新兴市场",
    "全球成长",
    "全球产业升级",
    "海外科技",
    "海外数字经济",
)


def fund_theme_text(fund: dict) -> str:
    return f"{fund.get('theme') or ''} {fund.get('fund_name') or ''} {fund.get('tracking_target') or ''}".upper()


def industry_context(fund: dict, return_1m: float, return_3m: float, return_6m: float) -> dict[str, object]:
    text = fund_theme_text(fund)
    is_structural_growth = any(keyword.upper() in text for keyword in STRUCTURAL_GROWTH_KEYWORDS)
    is_mean_reversion = any(keyword.upper() in text for keyword in MEAN_REVERSION_KEYWORDS)
    is_long_hold = any(keyword.upper() in text for keyword in LONG_HOLD_KEYWORDS)
    trend_confirmed = return_1m > 8 and return_3m > 6 and return_6m > 5
    if is_long_hold and trend_confirmed and return_3m > 15 and return_6m > 25:
        strength = "长期持有趋势确认"
        bonus = 7.5
        overheat_multiplier = 0.25
        volatility_multiplier = 0.30
    elif is_structural_growth and trend_confirmed:
        strength = "主线趋势确认"
        bonus = 5.5
        overheat_multiplier = 0.35
        volatility_multiplier = 0.55
    elif is_structural_growth:
        strength = "主线待确认"
        bonus = 2.0
        overheat_multiplier = 0.65
        volatility_multiplier = 0.80
    elif is_mean_reversion and not trend_confirmed:
        strength = "低位未确认"
        bonus = -8.0
        overheat_multiplier = 1.0
        volatility_multiplier = 1.0
    elif trend_confirmed:
        strength = "趋势确认"
        bonus = 2.5
        overheat_multiplier = 0.8
        volatility_multiplier = 1.0
    else:
        strength = "趋势待确认"
        bonus = 0.0
        overheat_multiplier = 1.0
        volatility_multiplier = 1.0
    return {
        "strength": strength,
        "bonus": bonus,
        "overheatMultiplier": overheat_multiplier,
        "volatilityMultiplier": volatility_multiplier,
        "isStructuralGrowth": is_structural_growth,
        "isMeanReversion": is_mean_reversion,
        "isLongHold": is_long_hold,
    }


def global_observation_score(fund: dict) -> tuple[float, str, str, str]:
    base_score = fund_rank_score(fund)
    return_1m = float(fund["return_1m"] or 0)
    return_3m = float(fund["return_3m"] or 0)
    return_6m = float(fund["return_6m"] or 0)
    max_drawdown = float(fund["max_drawdown"] or 0)
    volatility = float(fund["volatility"] or 0)
    context = industry_context(fund, return_1m, return_3m, return_6m)
    is_held = bool(fund.get("is_held"))
    market_value = float(fund.get("market_value_snapshot") or 0)
    holding_return = float(fund.get("holding_return_snapshot") or 0)

    overheat_penalty = max(0.0, return_1m - 16.0) * 1.35 * float(context["overheatMultiplier"])
    drawdown_penalty = max(0.0, abs(max_drawdown) - 22.0) * 0.9
    volatility_penalty = max(0.0, volatility - 34.0) * 0.45 * float(context["volatilityMultiplier"])
    trend_bonus = 4.0 if return_3m > 8 and return_6m > 10 else 0.0
    held_bonus = 0.0
    if is_held and return_3m > 15 and return_6m > 25:
        held_bonus = 10.0
    elif is_held and return_3m > 10 and return_6m > 15:
        held_bonus = 6.0
    if is_held and market_value >= 30000 and holding_return >= 10:
        held_bonus += 2.0
    score = round(max(0.0, min(100.0, base_score + trend_bonus + float(context["bonus"]) + held_bonus - overheat_penalty - drawdown_penalty - volatility_penalty)), 2)

    if is_held and context["strength"] == "长期持有趋势确认" and score >= 66:
        action_label = "已持有，长期趋势优先复盘"
        reason = "你已持有该基金，且近3月与近6月趋势仍强；这类长期配置不应只因波动较大被普通候选替代，优先复盘是否继续持有、是否只在明显回撤时调整仓位。"
    elif is_held and score >= 66:
        action_label = "已持有，优先复盘"
        reason = "你已持有该基金，且中期趋势证据较强；优先复盘是否继续持有、是否等待回调再决定仓位，而不是盲目换到外部候选。"
    elif context["strength"] == "长期持有趋势确认" and return_1m >= 18:
        action_label = "长期主线强势观察"
        reason = "该基金属于长期配置或海外/QDII方向，短期涨幅较快但中期趋势仍在；更适合列入重点复盘，而不是简单因为涨多就降级。"
    elif context["strength"] == "主线趋势确认" and return_1m >= 18:
        action_label = "强主线回调观察"
        reason = "短期涨幅较快，但所属主题具备中期趋势确认，适合等回调承接后再评估小仓节奏。"
    elif return_1m >= 18:
        action_label = "强势观察，不追高"
        reason = "近1月涨幅较快但行业证据未充分确认，更适合等回调，不宜只因涨幅追入。"
    elif max_drawdown <= -25:
        action_label = "回撤修复观察"
        reason = "回撤较深，若中期动量恢复，可作为修复型观察候选。"
    elif context["strength"] == "低位未确认":
        action_label = "低位不等于机会"
        reason = "低位主题尚未出现趋势确认，暂不因跌幅或估值低而提高优先级。"
    elif score >= 68:
        action_label = "小仓观察候选"
        reason = f"{context['strength']}，且中期收益、回撤控制和波动控制相对更均衡，适合优先复盘。"
    elif return_3m > 8 and max_drawdown > -22:
        action_label = "继续跟踪候选"
        reason = "中期动量尚可，回撤未明显失控，适合进入观察池。"
    else:
        action_label = "数据继续验证"
        reason = "趋势或风险证据不足，暂不提高优先级。"

    risk_note = "短期涨幅需要结合行业业绩、资金与中期趋势判断；已持有基金优先看是否继续持有和仓位上限，外部候选才考虑是否小仓观察。该提示不构成买入指令。"
    return score, action_label, reason, risk_note


def build_global_fund_picks(fund_rows: list[dict], portfolio_fund_rows: list[dict]) -> dict:
    unique_funds: dict[str, dict] = {}
    for fund in [*fund_rows, *portfolio_fund_rows]:
        key = fund_family_key(fund)
        existing = unique_funds.get(key)
        if existing is None:
            unique_funds[key] = fund
            continue
        existing_score, _, _, _ = global_observation_score(existing)
        candidate_score, _, _, _ = global_observation_score(fund)
        if candidate_score > existing_score or (fund.get("is_held") and not existing.get("is_held") and candidate_score + 3 >= existing_score):
            unique_funds[key] = fund

    ranked = []
    for fund in unique_funds.values():
        score, action_label, reason, risk_note = global_observation_score(fund)
        if score < 48:
            continue
        ranked.append(
            {
                "score": score,
                "payload": {
                    **build_fund_payload(
                        fund,
                        score,
                        action_label,
                        ["全局TOP候选", action_label, fund["fund_type"], fund["data_version"]],
                    ),
                    "observationScore": score,
                    "actionLabel": action_label,
                    "reason": reason,
                    "riskNote": risk_note,
                },
            }
        )

    ranked.sort(key=lambda item: item["score"], reverse=True)
    return {
        "title": "今日全局基金 TOP3 观察池",
        "methodology": "从你的真实持仓和全部行业基金池合并去重后排序：优先比较已持有基金是否强于外部候选，再结合行业主线证据调节短期涨幅惩罚。AI、CPO、存储、半导体等强主线若中期趋势确认，不机械惩罚上涨；低位但趋势未确认的主题不因便宜自动入选。用于复盘和小仓观察，不构成买入建议。",
        "items": [item["payload"] for item in ranked[:3]],
    }


def fund_family_key(fund: dict) -> str:
    name = str(fund.get("fund_name") or "")
    cleaned = re.sub(r"(?:ETF)?联接?[A-ZＡ-Ｚ]?$", "", name, flags=re.IGNORECASE)
    cleaned = re.sub(r"(?:A|B|C|D|E|I|Y|人民币|美元现汇|美元现钞|美元)$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", "", cleaned)
    return cleaned or str(fund.get("fund_code") or fund.get("fund_id"))


def main() -> None:
    trade_date = resolve_trade_date(os.getenv("TRADE_DATE"))
    job_name = "page-snapshot-build"
    batch_id = build_batch_id(trade_date)
    log_job_start(job_name, batch_id, trade_date)

    processed_count = 0
    try:
        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                trade_date, data_version = resolve_industry_data_context(cur, trade_date)
                cur.execute(
                    """
                    select
                        iod.*,
                        idm.performance_5d,
                        idm.performance_20d,
                        idm.performance_60d,
                        idm.risk_score,
                        idm.fund_count,
                        im.industry_name
                    from industry_opportunity_daily iod
                    join industry_daily_metrics idm
                      on idm.trade_date = iod.trade_date
                     and idm.industry_id = iod.industry_id
                     and idm.data_version = iod.data_version
                    join industry_master im on im.industry_id = iod.industry_id
                    where iod.trade_date = %s and iod.data_version = %s
                    order by iod.opportunity_score desc
                    """,
                    (trade_date, data_version),
                )
                industries = cur.fetchall()

                cur.execute(
                    """
                    select
                        ifm.industry_id,
                        ifm.priority_rank,
                        fdm.fund_id,
                        fdm.return_1d,
                        fdm.return_1m,
                        fdm.return_3m,
                        fdm.return_6m,
                        fdm.max_drawdown,
                        fdm.volatility,
                        fdm.aum,
                        fdm.founded_years,
                        fdm.top_holdings_json,
                        fm.fund_name,
                        fm.fund_code,
                        fm.fund_type,
                        fm.theme,
                        fm.tracking_target,
                        fm.fund_company,
                        fm.tradable_on_exchange,
                        fm.fee_rate,
                        fdm.data_version
                    from industry_fund_mapping ifm
                    join fund_master fm on fm.fund_id = ifm.fund_id
                    join lateral (
                        select *
                        from fund_daily_metrics x
                        where x.fund_id = fm.fund_id
                        order by x.trade_date desc,
                                 case when x.data_version = %s then 0 else 1 end,
                                 x.updated_at desc
                        limit 1
                    ) fdm on true
                    where ifm.mapping_type in ('top10-auto', 'theme', 'user-selected')
                    order by ifm.industry_id, ifm.priority_rank asc, fdm.return_3m desc nulls last
                    """,
                    (AUTO_TOP10_DATA_VERSION,),
                )
                fund_rows = cur.fetchall()
                funds_by_industry_id: dict[str, list[dict]] = {}
                for fund in fund_rows:
                    funds_by_industry_id.setdefault(fund["industry_id"], []).append(fund)

                cur.execute(
                    """
                    select
                        'portfolio' as industry_id,
                        0 as priority_rank,
                        coalesce(fm.fund_id, 'holding-' || p.fund_code, p.position_id) as fund_id,
                        fdm.return_1d,
                        fdm.return_1m,
                        fdm.return_3m,
                        fdm.return_6m,
                        fdm.max_drawdown,
                        fdm.volatility,
                        fdm.aum,
                        fdm.founded_years,
                        fdm.top_holdings_json,
                        coalesce(fm.fund_name, p.fund_name) as fund_name,
                        p.fund_code,
                        coalesce(fm.fund_type, '自选基金') as fund_type,
                        coalesce(fm.theme, '自选基金') as theme,
                        coalesce(fm.tracking_target, p.fund_name) as tracking_target,
                        coalesce(fm.fund_company, '') as fund_company,
                        coalesce(fm.tradable_on_exchange, false) as tradable_on_exchange,
                        coalesce(fm.fee_rate, 0) as fee_rate,
                        coalesce(fdm.data_version, 'portfolio-snapshot') as data_version,
                        true as is_held,
                        p.market_value_snapshot,
                        p.holding_return_snapshot
                    from portfolio_position_snapshot p
                    left join fund_master fm on fm.fund_code = p.fund_code
                    left join lateral (
                        select *
                        from fund_daily_metrics x
                        where x.fund_id = fm.fund_id
                        order by x.trade_date desc, x.updated_at desc
                        limit 1
                    ) fdm on true
                    where p.fund_code is not null
                      and fdm.fund_id is not null
                    order by p.market_value_snapshot desc nulls last
                    """
                )
                portfolio_fund_rows = cur.fetchall()

                cur.execute(
                    """
                    select industry_id, event_date, event_title, event_summary
                    from industry_events_daily
                    where trade_date = %s and data_version = %s
                    order by priority_rank asc, event_date desc
                    """,
                    (trade_date, data_version),
                )
                events = cur.fetchall()
                events_by_industry: dict[str, list[dict]] = {}
                for event in events:
                    events_by_industry.setdefault(event["industry_id"], []).append(event)

                cur.execute("delete from homepage_snapshot_daily where snapshot_key = 'homepage'")
                cur.execute(
                    "delete from industry_detail_snapshot_daily where trade_date = %s and data_version = %s",
                    (trade_date, data_version),
                )
                cur.execute(
                    "delete from watchlist_change_summary_daily where trade_date = %s and data_version = %s",
                    (trade_date, data_version),
                )

                homepage_payload = {
                    "marketOverview": {
                        "strongTrendCount": sum(1 for row in industries if float(row["trend_score"] or 0) >= 80),
                        "lowPositionCount": sum(1 for row in industries if float(row["valuation_score"] or 0) >= 80),
                        "summary": "当前展示基于盘后导入数据生成，适合用于下一交易日开盘前的行业与基金观察。"
                    },
                    "globalFundPicks": build_global_fund_picks(fund_rows, portfolio_fund_rows),
                    "industries": [],
                }

                for row in industries:
                    related_funds = []
                    raw_related_funds = funds_by_industry_id.get(row["industry_id"], [])[:10]
                    trend_strategy = build_trend_strategy(row, raw_related_funds)
                    for index, fund in enumerate(raw_related_funds, start=1):
                        score = fund_rank_score(fund)
                        signal = fund_rank_signal(score, fund)
                        related_funds.append(
                            build_fund_payload(
                                fund,
                                score,
                                signal,
                                [f"行业第 {index}", signal, fund["fund_type"], fund["data_version"]],
                            )
                        )

                    homepage_payload["industries"].append(
                        {
                            "industryId": row["industry_id"],
                            "industryName": row["industry_name"],
                            "opportunityScore": int(row["opportunity_score"] or 0),
                            "trendScore": int(row["trend_score"] or 0),
                            "capitalScore": int(row["capital_score"] or 0),
                            "valuationScore": int(row["valuation_score"] or 0),
                            "riskLevel": build_risk_hint(row["risk_level"]),
                            "performance5d": float(row["performance_5d"] or 0),
                            "performance20d": float(row["performance_20d"] or 0),
                            "fundCount": int(row["fund_count"] or 0),
                            "tags": row["tags_json"] or [],
                            "summary": row["summary"],
                            "label": row["label"],
                            "focusReason": row["focus_reason"],
                            "methodology": row["methodology_json"],
                            "relatedFunds": related_funds,
                            "trendStrategy": trend_strategy,
                        }
                    )

                    detail_payload = {
                        "industryId": row["industry_id"],
                        "industryName": row["industry_name"],
                        "headline": row["summary"],
                        "opportunityLabel": row["label"],
                        "thesisSummary": row["summary"],
                        "trendMetrics": [
                            {"name": "趋势强度", "score": int(row["trend_score"] or 0), "summary": "近阶段趋势评分较高。"}
                        ],
                        "capitalMetrics": [
                            {"name": "资金强度", "score": int(row["capital_score"] or 0), "summary": "盘后资金热度代理指标较强。"}
                        ],
                        "valuationMetrics": [
                            {"name": "估值性价比", "score": int(row["valuation_score"] or 0), "summary": "估值位置用于衡量性价比。"}
                        ],
                        "riskMetrics": [
                            {"name": "拥挤度风险", "score": int(row["risk_score"] or 0), "summary": "风险分越高，越需要注意短期波动。"}
                        ],
                        "timelineEvents": [
                            {
                                "date": event["event_date"].isoformat(),
                                "title": event["event_title"],
                                "summary": event["event_summary"],
                            }
                            for event in events_by_industry.get(row["industry_id"], [])
                        ],
                        "chartSeries": [
                            {"label": "趋势", "value": int(row["trend_score"] or 0)},
                            {"label": "资金", "value": int(row["capital_score"] or 0)},
                            {"label": "估值", "value": int(row["valuation_score"] or 0)},
                            {"label": "机会", "value": int(row["opportunity_score"] or 0)},
                        ],
                        "relatedFunds": related_funds,
                        "trendStrategy": trend_strategy,
                        "disclaimer": "当前页面基于盘后快照生成，仅用于信息整理与观察，不构成投资建议。",
                        "conclusionCards": [
                            {"title": "当前判断", "value": row["label"], "summary": row["summary"]},
                            {"title": "趋势策略", "value": trend_strategy["signal"], "summary": trend_strategy["hint"]},
                            {"title": "资金强度", "value": str(int(row["capital_score"] or 0)), "summary": "资金评分来自热度与活跃度代理指标。"},
                            {"title": "估值性价比", "value": str(int(row["valuation_score"] or 0)), "summary": "估值评分用于判断相对吸引力。"},
                            {"title": "拥挤度风险", "value": str(int(row["risk_score"] or 0)), "summary": "风险分越高，越要控制观察节奏。"},
                        ],
                    }

                    cur.execute(
                        """
                        insert into industry_detail_snapshot_daily (
                            trade_date, industry_id, snapshot_payload, status, source_batch_id, data_version, created_at, updated_at
                        )
                        values (%s, %s, %s, 'published', %s, %s, now(), now())
                        """,
                        (trade_date, row["industry_id"], Jsonb(detail_payload), batch_id, data_version),
                    )
                    processed_count += 1

                cur.execute(
                    """
                    insert into homepage_snapshot_daily (
                        trade_date, snapshot_key, snapshot_payload, status, source_batch_id, data_version, created_at, updated_at
                    )
                    values (%s, 'homepage', %s, 'published', %s, %s, now(), now())
                    """,
                    (trade_date, Jsonb(homepage_payload), batch_id, data_version),
                )

                for industry in homepage_payload["industries"]:
                    cur.execute(
                        """
                        insert into watchlist_change_summary_daily (
                            trade_date, item_type, item_id, status_label, latest_change, watch_hint, source_batch_id,
                            data_version, created_at, updated_at
                        )
                        values (%s, 'industry', %s, %s, %s, %s, %s, %s, now(), now())
                        """,
                        (
                            trade_date,
                            industry["industryId"],
                            industry["label"],
                            industry["summary"],
                            industry["focusReason"],
                            batch_id,
                            data_version,
                        ),
                    )
                    processed_count += 1

                for fund in fund_rows:
                    status_label = "持续关注"
                    if float(fund["return_3m"] or 0) >= 15:
                        status_label = "强势跟踪"
                    elif float(fund["return_3m"] or 0) >= 10:
                        status_label = "趋势改善"

                    cur.execute(
                        """
                        insert into watchlist_change_summary_daily (
                            trade_date, item_type, item_id, status_label, latest_change, watch_hint, source_batch_id,
                            data_version, created_at, updated_at
                        )
                        values (%s, 'fund', %s, %s, %s, %s, %s, %s, now(), now())
                        """,
                        (
                            trade_date,
                            fund["fund_id"],
                            status_label,
                            f"{fund['fund_name']}近 3 月收益为 {float(fund['return_3m'] or 0):.1f}%，当前适合持续观察。",
                            f"结合{fund['theme']}主题节奏，继续关注波动、回撤与跟踪说明的匹配度。",
                            batch_id,
                            data_version,
                        ),
                    )
                    processed_count += 1
            conn.commit()

        status = "success" if processed_count > 0 else "skipped"
        print(f"Page snapshots built rows={processed_count}")
        log_job_end(job_name, batch_id, trade_date, run_status=status, processed_count=processed_count)
    except Exception as exc:
        log_job_end(job_name, batch_id, trade_date, run_status="failed", processed_count=processed_count, error_message=str(exc))
        raise


if __name__ == "__main__":
    main()
