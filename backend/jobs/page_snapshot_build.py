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


def as_float_or_none(value) -> float | None:
    if value is None:
        return None
    return float(value)


def score_input(value, neutral: float = 0.0) -> float:
    parsed = as_float_or_none(value)
    return neutral if parsed is None else parsed


def score_component(value: float | None, low: float, high: float, missing: float = 45.0) -> float:
    if value is None:
        return missing
    return max(0.0, min(100.0, (value - low) / (high - low) * 100.0))


def public_data_tag(data_version: str | None) -> str:
    if data_version == AUTO_TOP10_DATA_VERSION:
        return "Tushare行业基金池"
    if data_version == FALLBACK_DATA_VERSION:
        return "盘后快照"
    if data_version == "portfolio-snapshot":
        return "持仓快照"
    return "数据快照"


def clamp_score(value: float) -> int:
    return int(max(0.0, min(100.0, round(value))))


def fmt_percent_or_pending(value: float | None) -> str:
    return "待补" if value is None else f"{value:.1f}%"


def core_metric_completeness(fund: dict) -> float:
    keys = ("return_1m", "return_3m", "return_6m", "max_drawdown", "volatility", "founded_years")
    present = sum(1 for key in keys if as_float_or_none(fund.get(key)) is not None)
    return present / len(keys)


def resolve_industry_data_context(cur, requested_trade_date) -> tuple[date, str]:
    configured = get_settings().active_data_version
    version_filter = "and data_version = %s" if configured and configured != "latest" else ""
    params = (requested_trade_date, configured) if version_filter else (requested_trade_date,)
    version_order = "max(updated_at) desc" if version_filter else f"case when data_version = '{FALLBACK_DATA_VERSION}' then 1 else 0 end, max(updated_at) desc"
    cur.execute(
        f"""
        select trade_date, data_version
        from industry_opportunity_daily
        where trade_date <= %s
        {version_filter}
        group by trade_date, data_version
        order by trade_date desc, {version_order}
        limit 1
        """,
        params,
    )
    row = cur.fetchone()
    if row:
        return row["trade_date"], row["data_version"]
    return requested_trade_date, configured if configured and configured != "latest" else FALLBACK_DATA_VERSION


def load_industries_with_supplements(cur, trade_date: date, data_version: str) -> list[dict]:
    base_select = """
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
    """
    if data_version == FALLBACK_DATA_VERSION:
        cur.execute(f"{base_select} order by iod.opportunity_score desc", (trade_date, data_version))
        return cur.fetchall()

    cur.execute(
        f"""
        with primary_rows as (
            {base_select}
        ),
        supplemental_rows as (
            {base_select}
        )
        select *
        from primary_rows
        union all
        select *
        from supplemental_rows s
        where not exists (
            select 1
            from primary_rows p
            where p.industry_id = s.industry_id
        )
        order by opportunity_score desc
        """,
        (trade_date, data_version, trade_date, FALLBACK_DATA_VERSION),
    )
    return cur.fetchall()


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


def build_capital_heat_series(row: dict) -> list[dict[str, int | str]]:
    capital_score = score_input(row.get("capital_score"), 0)
    performance_5d = score_input(row.get("performance_5d"), 0)
    performance_20d = score_input(row.get("performance_20d"), 0)
    performance_60d = score_input(row.get("performance_60d"), performance_20d)
    return [
        {"label": "60日代理", "value": clamp_score(capital_score - 8 + performance_60d * 0.15)},
        {"label": "20日代理", "value": clamp_score(capital_score - 3 + performance_20d * 0.2)},
        {"label": "5日代理", "value": clamp_score(capital_score + performance_5d * 0.45)},
        {"label": "当前热度", "value": clamp_score(capital_score)},
    ]


def build_long_term_events(row: dict, events: list[dict]) -> list[dict]:
    industry_id = row["industry_id"]
    industry_name = row["industry_name"]
    risk_score = int(row["risk_score"] or 0)
    risk_level = build_risk_hint(row["risk_level"])
    output = []
    for index, event in enumerate(events, start=1):
        impact = "risk_or_invalidation" if risk_score >= 75 or risk_level == "高" else "long_term_support"
        risk_note = (
            "当前拥挤度或风险评分偏高，该事件只能作为复核线索，不能单独推动买入计划。"
            if impact == "risk_or_invalidation"
            else "仍需结合趋势、估值、资金和基金持仓匹配度继续验证，不能作为短线交易信号。"
        )
        output.append(
            {
                "eventId": f"{industry_id}-{event['event_date'].isoformat()}-{index}",
                "industryId": industry_id,
                "industryName": industry_name,
                "eventDate": event["event_date"].isoformat(),
                "publishedAt": event["event_date"].isoformat(),
                "sourceType": "manual_import",
                "sourceName": "行业事件快照",
                "title": event["event_title"],
                "summary": event["event_summary"],
                "category": "other",
                "longTermImpact": impact,
                "confidence": "medium",
                "freshness": "watch",
                "thesisEffect": event["event_summary"],
                "riskNote": risk_note,
                "invalidationSignal": "后续数据不支持事件兑现、资金显著退潮或风险评分继续抬升时，需要下调观察优先级。",
            }
        )
    return output


def build_event_impact_summary(row: dict, long_term_events: list[dict]) -> dict:
    support_count = sum(1 for event in long_term_events if event["longTermImpact"] == "long_term_support")
    risk_count = sum(1 for event in long_term_events if event["longTermImpact"] == "risk_or_invalidation")
    short_term_noise_count = sum(1 for event in long_term_events if event["longTermImpact"] == "short_term_noise")
    impact_direction = "risk_or_invalidation" if risk_count > 0 and risk_count >= support_count else "long_term_support"
    return {
        "industryId": row["industry_id"],
        "asOfDate": row["trade_date"].isoformat(),
        "supportCount": support_count,
        "riskCount": risk_count,
        "shortTermNoiseCount": short_term_noise_count,
        "confidence": "medium" if long_term_events else "low",
        "impactDirection": impact_direction if long_term_events else "insufficient_evidence",
        "supportingEvidence": [
            event["title"] for event in long_term_events if event["longTermImpact"] == "long_term_support"
        ],
        "weakeningEvidence": [
            event["title"] for event in long_term_events if event["longTermImpact"] == "risk_or_invalidation"
        ],
        "invalidationConditions": [
            "事件兑现弱于预期或后续数据无法验证产业逻辑",
            "短期拥挤度继续抬升且回撤扩大",
            "相关基金持仓映射与行业主线明显不匹配",
        ],
        "riskControlHint": "长期事件只用于验证行业逻辑、风险和失效条件，不作为短线交易信号，也不能绕过风险阻断。",
        "methodology": "事件按长期支撑、风险/失效和短期扰动分组，最终观察状态仍由确定性趋势、资金、估值和风险规则决定。",
    }


def fund_rank_score(fund: dict) -> float:
    return_1m = as_float_or_none(fund["return_1m"])
    return_3m = as_float_or_none(fund["return_3m"])
    return_6m = as_float_or_none(fund["return_6m"])
    max_drawdown = as_float_or_none(fund["max_drawdown"])
    volatility = as_float_or_none(fund["volatility"])
    age = as_float_or_none(fund["founded_years"])
    score = (
        score_component(return_3m, -15, 30) * 0.30
        + score_component(return_1m, -8, 18) * 0.16
        + score_component(return_6m, -20, 45) * 0.14
        + (45.0 if max_drawdown is None else max(0, min(100, 100 + max_drawdown * 3))) * 0.18
        + (45.0 if volatility is None else max(0, min(100, 100 - max(volatility - 12, 0) * 2.8))) * 0.12
        + (45.0 if age is None else max(0, min(100, age / 5 * 100))) * 0.10
    )
    completeness_penalty = (1.0 - core_metric_completeness(fund)) * 12.0
    return round(max(0.0, score - completeness_penalty), 2)


def fund_rank_signal(score: float, fund: dict) -> str:
    return_1m = as_float_or_none(fund["return_1m"])
    max_drawdown = as_float_or_none(fund["max_drawdown"])
    if max_drawdown is not None and max_drawdown <= -25:
        return "高回撤观察"
    if return_1m is not None and return_1m >= 18:
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
    payload_tags = list(tags)
    if fund.get("concentration_label") and str(fund["concentration_label"]).startswith("光通信链持仓"):
        payload_tags.append(str(fund["concentration_label"]))
    for holding_name in (fund.get("top_holdings_json") or [])[:3]:
        payload_tags.append(str(holding_name))
    payload = {
        "fundId": fund["fund_id"],
        "fundName": fund["fund_name"],
        "fundCode": fund["fund_code"],
        "fundType": fund["fund_type"],
        "theme": fund["theme"],
        "trackingTarget": fund["tracking_target"],
        "return1d": as_float_or_none(fund["return_1d"]),
        "return1m": as_float_or_none(fund["return_1m"]),
        "return3m": as_float_or_none(fund["return_3m"]),
        "return6m": as_float_or_none(fund["return_6m"]),
        "maxDrawdown": as_float_or_none(fund["max_drawdown"]),
        "volatility": as_float_or_none(fund["volatility"]),
        "aum": aum,
        "feeRate": as_float_or_none(fund["fee_rate"]),
        "tradableOnExchange": fund["tradable_on_exchange"],
        "tags": payload_tags[:8],
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


def industry_context(fund: dict, return_1m: float | None, return_3m: float | None, return_6m: float | None) -> dict[str, object]:
    text = fund_theme_text(fund)
    is_structural_growth = any(keyword.upper() in text for keyword in STRUCTURAL_GROWTH_KEYWORDS)
    is_mean_reversion = any(keyword.upper() in text for keyword in MEAN_REVERSION_KEYWORDS)
    is_long_hold = any(keyword.upper() in text for keyword in LONG_HOLD_KEYWORDS)
    trend_confirmed = return_1m is not None and return_3m is not None and return_6m is not None and return_1m > 8 and return_3m > 6 and return_6m > 5
    if is_long_hold and trend_confirmed and return_3m is not None and return_6m is not None and return_3m > 15 and return_6m > 25:
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
    return_1m_raw = as_float_or_none(fund["return_1m"])
    return_3m_raw = as_float_or_none(fund["return_3m"])
    return_6m_raw = as_float_or_none(fund["return_6m"])
    max_drawdown_raw = as_float_or_none(fund["max_drawdown"])
    volatility_raw = as_float_or_none(fund["volatility"])
    context = industry_context(fund, return_1m_raw, return_3m_raw, return_6m_raw)
    return_1m = return_1m_raw if return_1m_raw is not None else -999.0
    return_3m = return_3m_raw if return_3m_raw is not None else -999.0
    return_6m = return_6m_raw if return_6m_raw is not None else -999.0
    max_drawdown = max_drawdown_raw if max_drawdown_raw is not None else 0.0
    volatility = volatility_raw if volatility_raw is not None else 999.0
    is_held = bool(fund.get("is_held"))
    market_value = float(fund.get("market_value_snapshot") or 0)
    holding_return = float(fund.get("holding_return_snapshot") or 0)

    overheat_penalty = max(0.0, return_1m_raw - 16.0) * 1.35 * float(context["overheatMultiplier"]) if return_1m_raw is not None else 0.0
    drawdown_penalty = max(0.0, abs(max_drawdown_raw) - 22.0) * 0.9 if max_drawdown_raw is not None else 4.0
    volatility_penalty = max(0.0, volatility_raw - 34.0) * 0.45 * float(context["volatilityMultiplier"]) if volatility_raw is not None else 3.0
    trend_bonus = 4.0 if return_3m_raw is not None and return_6m_raw is not None and return_3m_raw > 8 and return_6m_raw > 10 else 0.0
    held_bonus = 0.0
    if is_held and return_3m_raw is not None and return_6m_raw is not None and return_3m_raw > 15 and return_6m_raw > 25:
        held_bonus = 10.0
    elif is_held and return_3m_raw is not None and return_6m_raw is not None and return_3m_raw > 10 and return_6m_raw > 15:
        held_bonus = 6.0
    if is_held and market_value >= 30000 and holding_return >= 10:
        held_bonus += 2.0
    completeness_penalty = (1.0 - core_metric_completeness(fund)) * 10.0
    score = round(max(0.0, min(100.0, base_score + trend_bonus + float(context["bonus"]) + held_bonus - overheat_penalty - drawdown_penalty - volatility_penalty - completeness_penalty)), 2)

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
    elif max_drawdown_raw is not None and max_drawdown <= -25:
        action_label = "回撤修复观察"
        reason = "回撤较深，若中期动量恢复，可作为修复型观察候选。"
    elif context["strength"] == "低位未确认":
        action_label = "低位不等于机会"
        reason = "低位主题尚未出现趋势确认，暂不因跌幅或估值低而提高优先级。"
    elif score >= 68:
        action_label = "小仓观察候选"
        reason = f"{context['strength']}，且中期收益、回撤控制和波动控制相对更均衡，适合优先复盘。"
    elif return_3m_raw is not None and max_drawdown_raw is not None and return_3m > 8 and max_drawdown > -22:
        action_label = "继续跟踪候选"
        reason = "中期动量尚可，回撤未明显失控，适合进入观察池。"
    else:
        action_label = "数据继续验证"
        reason = "趋势或风险证据不足，暂不提高优先级。"

    risk_note = "短期涨幅需要结合行业业绩、资金与中期趋势判断；已持有基金优先看是否继续持有和仓位上限，外部候选才考虑是否小仓观察。该提示不构成买入指令。"
    return score, action_label, reason, risk_note


def _global_position_limit(fund: dict) -> float:
    context_text = fund_theme_text(fund)
    if any(keyword.upper() in context_text for keyword in LONG_HOLD_KEYWORDS):
        return 18.0
    if any(keyword.upper() in context_text for keyword in STRUCTURAL_GROWTH_KEYWORDS):
        return 10.0
    return 12.0


def _legacy_global_decision_timing(fund: dict, observation_score: float, total_portfolio_value: float = 0.0) -> dict[str, object]:
    return_1m_raw = as_float_or_none(fund["return_1m"])
    return_3m_raw = as_float_or_none(fund["return_3m"])
    return_6m_raw = as_float_or_none(fund["return_6m"])
    max_drawdown_raw = as_float_or_none(fund["max_drawdown"])
    volatility_raw = as_float_or_none(fund["volatility"])
    return_1m = return_1m_raw if return_1m_raw is not None else -999.0
    return_3m = return_3m_raw if return_3m_raw is not None else -999.0
    return_6m = return_6m_raw if return_6m_raw is not None else -999.0
    max_drawdown = max_drawdown_raw if max_drawdown_raw is not None else 0.0
    volatility = volatility_raw if volatility_raw is not None else 999.0
    founded_years_raw = as_float_or_none(fund["founded_years"])
    founded_years = int(founded_years_raw) if founded_years_raw is not None else 0
    is_held = bool(fund.get("is_held"))
    market_value = float(fund.get("market_value_snapshot") or 0)
    position_ratio = round(market_value / total_portfolio_value * 100, 2) if total_portfolio_value else 0.0
    position_limit = _global_position_limit(fund)
    context = industry_context(fund, return_1m_raw, return_3m_raw, return_6m_raw)

    overheat = return_1m_raw is not None and return_1m >= 18
    trend_confirmed = return_3m_raw is not None and return_6m_raw is not None and return_3m > 8 and return_6m > 10
    risk_control_ok = max_drawdown_raw is not None and volatility_raw is not None and max_drawdown > -22 and volatility < 32
    data_quality_ok = founded_years >= 2

    buy_readiness_score = observation_score
    if overheat:
        buy_readiness_score -= 14
    if max_drawdown_raw is not None and max_drawdown <= -25:
        buy_readiness_score -= 12
    if volatility_raw is not None and volatility >= 34:
        buy_readiness_score -= 8
    if not trend_confirmed:
        buy_readiness_score -= 8
    if not data_quality_ok:
        buy_readiness_score -= 5
    buy_readiness_score -= (1.0 - core_metric_completeness(fund)) * 12.0
    if is_held:
        buy_readiness_score -= 4
    if is_held and position_ratio >= position_limit:
        buy_readiness_score -= 28
    buy_readiness_score = round(max(0.0, min(100.0, buy_readiness_score)), 2)

    if is_held and position_ratio >= position_limit * 1.35:
        decision_stage = "控仓优先"
        next_action = "这只基金仓位明显超过建议上限，先做再平衡复盘，不再把高分理解成加仓。"
        position_advice = f"当前约 {position_ratio:.1f}%；建议上限约 {position_limit:.0f}%，新增资金应转为观察或分散。"
    elif is_held and position_ratio >= position_limit:
        decision_stage = "暂停加仓"
        next_action = "仓位已到建议上限附近，保持观察，新增资金等待回调或转向低相关候选。"
        position_advice = f"当前约 {position_ratio:.1f}%；建议上限约 {position_limit:.0f}%。"
    elif (max_drawdown_raw is not None and max_drawdown <= -28) or (return_1m_raw is not None and return_3m_raw is not None and return_1m < -10 and return_3m < 0):
        decision_stage = "减仓复盘"
        next_action = "先复盘趋势是否破坏，暂停新增仓位；若连续走弱，优先控制仓位。"
        position_advice = "高波动或趋势破坏阶段，适合把单只基金控制在组合低占比，避免越跌越集中。"
    elif is_held and trend_confirmed and risk_control_ok:
        decision_stage = "继续持有"
        next_action = "持有优先，新增资金只在明显回调或组合再平衡时考虑。"
        position_advice = "已有仓位先看上限和回撤承受力；不因观察分高自动加仓。"
    elif overheat and trend_confirmed:
        decision_stage = "等回调"
        next_action = "主线仍强，但短期涨幅偏快；等待回撤、缩量企稳或分批节奏。"
        position_advice = "外部候选只适合观察或很小仓试探，避免一次性追高。"
    elif buy_readiness_score >= 72 and risk_control_ok:
        decision_stage = "可小仓观察"
        next_action = "满足趋势和风险条件后，可考虑小仓分批观察，不做重仓买入信号。"
        position_advice = "首次观察仓建议保持轻量，后续用回撤和行业证据决定是否提高仓位。"
    elif context["strength"] == "低位未确认":
        decision_stage = "只观察"
        next_action = "低位还没有趋势确认，先等待资金、趋势或行业证据改善。"
        position_advice = "不要因为便宜直接补仓；先用观察池跟踪。"
    else:
        decision_stage = "继续验证"
        next_action = "证据还不够完整，继续跟踪近1月、近3月趋势和回撤变化。"
        position_advice = "暂不提高仓位优先级。"

    if overheat:
        buy_trigger = "等待从近1月高位回撤约5%-8%，且近3月趋势仍为正时，再评估分批。"
    elif buy_readiness_score >= 72:
        buy_trigger = "近1月不过热、近3月和近6月趋势保持为正、回撤未扩大时，才进入小仓观察。"
    else:
        buy_trigger = "先等观察分稳定在72以上，并确认行业趋势、回撤和波动没有恶化。"

    sell_trigger = "若近1月转负且近3月跌破0，或最大回撤扩大到-25%以下，需要暂停加仓并做减仓复盘。"
    if is_held:
        sell_trigger = "已持有时，若中期趋势转弱、最大回撤跌破-25%或单只占比超过自身上限，应优先复盘减仓/控仓。"

    return {
        "decisionStage": decision_stage,
        "buyReadinessScore": buy_readiness_score,
        "nextAction": next_action,
        "buyTrigger": buy_trigger,
        "sellTrigger": sell_trigger,
        "positionAdvice": position_advice,
        "confidence": "high" if data_quality_ok and risk_control_ok else "medium" if data_quality_ok else "low",
        "positionRatio": position_ratio,
        "positionLimit": position_limit,
        "checklist": [
            f"近1月涨幅 {return_1m:.1f}%，{'偏热，避免追高' if overheat else '未触发追高惩罚'}。",
            f"近3月/近6月为 {return_3m:.1f}% / {return_6m:.1f}%，{'中期趋势确认' if trend_confirmed else '中期趋势仍需验证'}。",
            f"最大回撤 {max_drawdown:.1f}%，波动率 {volatility:.1f}%，{'风险暂可控' if risk_control_ok else '风险控制需要谨慎'}。",
        ],
    }


def global_decision_timing(fund: dict, observation_score: float, total_portfolio_value: float = 0.0) -> dict[str, object]:
    return_1m = as_float_or_none(fund["return_1m"])
    return_3m = as_float_or_none(fund["return_3m"])
    return_6m = as_float_or_none(fund["return_6m"])
    max_drawdown = as_float_or_none(fund["max_drawdown"])
    volatility = as_float_or_none(fund["volatility"])
    founded_years = as_float_or_none(fund["founded_years"])
    is_held = bool(fund.get("is_held"))
    market_value = float(fund.get("market_value_snapshot") or 0)
    position_ratio = round(market_value / total_portfolio_value * 100, 2) if total_portfolio_value else 0.0
    position_limit = _global_position_limit(fund)
    context = industry_context(fund, return_1m, return_3m, return_6m)

    overheat = return_1m is not None and return_1m >= 18
    trend_confirmed = return_3m is not None and return_6m is not None and return_3m > 8 and return_6m > 10
    risk_control_ok = max_drawdown is not None and volatility is not None and max_drawdown > -22 and volatility < 32
    data_quality_ok = founded_years is not None and founded_years >= 2 and core_metric_completeness(fund) >= 0.75

    buy_readiness_score = observation_score
    if overheat:
        buy_readiness_score -= 14
    if max_drawdown is None:
        buy_readiness_score -= 10
    elif max_drawdown <= -25:
        buy_readiness_score -= 12
    if volatility is None:
        buy_readiness_score -= 8
    elif volatility >= 34:
        buy_readiness_score -= 8
    if not trend_confirmed:
        buy_readiness_score -= 8
    if not data_quality_ok:
        buy_readiness_score -= 5
    buy_readiness_score -= (1.0 - core_metric_completeness(fund)) * 12.0
    if is_held:
        buy_readiness_score -= 4
    if is_held and position_ratio >= position_limit:
        buy_readiness_score -= 28
    buy_readiness_score = round(max(0.0, min(100.0, buy_readiness_score)), 2)

    if is_held and position_ratio >= position_limit * 1.35:
        decision_stage = "position_control_review"
        next_action = "Position is above the suggested limit; prioritize risk review before any new allocation."
        position_advice = f"Current ratio is about {position_ratio:.1f}%; suggested limit is about {position_limit:.0f}%."
    elif is_held and position_ratio >= position_limit:
        decision_stage = "pause_addition"
        next_action = "Position is near the suggested limit; keep observing and wait for portfolio rebalance conditions."
        position_advice = f"Current ratio is about {position_ratio:.1f}%; suggested limit is about {position_limit:.0f}%."
    elif (max_drawdown is not None and max_drawdown <= -28) or (return_1m is not None and return_3m is not None and return_1m < -10 and return_3m < 0):
        decision_stage = "risk_review"
        next_action = "Review whether the trend has broken before considering any staged plan."
        position_advice = "High volatility or weakening trend requires position discipline."
    elif is_held and trend_confirmed and risk_control_ok:
        decision_stage = "hold_review"
        next_action = "For held funds, review holding quality and position limit before adding capital."
        position_advice = "Do not convert a high observation score into automatic position increase."
    elif overheat and trend_confirmed:
        decision_stage = "wait_for_pullback"
        next_action = "Trend is strong but short-term heat is high; wait for pullback or calmer volume."
        position_advice = "External candidates should remain in observation or very small staged research only."
    elif buy_readiness_score >= 72 and risk_control_ok:
        decision_stage = "staged_plan_candidate"
        next_action = "Eligible for a staged-buy plan draft after rule checks; still no automatic execution."
        position_advice = "Start from a light staged plan and recheck drawdown, volatility, and industry evidence."
    elif context["isMeanReversion"] and not trend_confirmed:
        decision_stage = "watch_only"
        next_action = "Low valuation without trend confirmation should stay in observation."
        position_advice = "Do not increase priority only because the fund looks cheap."
    else:
        decision_stage = "need_more_evidence"
        next_action = "Keep tracking 1m/3m/6m trend, drawdown, volatility, and industry evidence."
        position_advice = "Do not raise allocation priority before evidence improves."

    if overheat:
        buy_trigger = "Wait for a 5%-8% pullback from recent 1m heat while 3m trend remains positive."
    elif buy_readiness_score >= 72 and risk_control_ok:
        buy_trigger = "Only enter staged-plan research when trend is positive, not overheated, and risk metrics remain valid."
    else:
        buy_trigger = "Wait until observation score stabilizes above 72 with complete trend and risk evidence."

    sell_trigger = "If 1m turns negative with 3m breakdown, or drawdown expands below -25%, pause additions and review risk."
    if is_held:
        sell_trigger = "For held funds, if medium-term trend weakens, drawdown breaches -25%, or position exceeds limit, prioritize control review."

    return {
        "decisionStage": decision_stage,
        "buyReadinessScore": buy_readiness_score,
        "nextAction": next_action,
        "buyTrigger": buy_trigger,
        "sellTrigger": sell_trigger,
        "positionAdvice": position_advice,
        "confidence": "high" if data_quality_ok and risk_control_ok else "medium" if data_quality_ok else "low",
        "positionRatio": position_ratio,
        "positionLimit": position_limit,
        "checklist": [
            f"1m return {fmt_percent_or_pending(return_1m)}; {'overheated, wait for pullback' if overheat else 'not overheated or missing data'}.",
            f"3m/6m return {fmt_percent_or_pending(return_3m)} / {fmt_percent_or_pending(return_6m)}; {'trend confirmed' if trend_confirmed else 'trend still needs validation'}.",
            f"max drawdown {fmt_percent_or_pending(max_drawdown)}; volatility {fmt_percent_or_pending(volatility)}; {'risk check passed' if risk_control_ok else 'risk or data quality needs review'}.",
        ],
    }


def build_global_fund_picks(fund_rows: list[dict], portfolio_fund_rows: list[dict]) -> dict:
    total_portfolio_value = sum(float(fund.get("market_value_snapshot") or 0) for fund in portfolio_fund_rows)
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
        timing = global_decision_timing(fund, score, total_portfolio_value)
        ranked.append(
            {
                "score": score,
                "payload": {
                    **build_fund_payload(
                        fund,
                        score,
                        action_label,
                        ["全局TOP候选", action_label, fund["fund_type"], public_data_tag(fund["data_version"])],
                    ),
                    "observationScore": score,
                    "actionLabel": action_label,
                    "reason": reason,
                    "riskNote": risk_note,
                    "decisionTiming": timing,
                },
            }
        )

    ranked.sort(key=lambda item: item["score"], reverse=True)
    return {
        "title": "今日全局基金 TOP3 决策观察池",
        "methodology": "从你的真实持仓和全部行业基金池合并去重后排序，并把观察分拆成买入节奏、卖出/控仓触发和下一步动作。强主线不机械惩罚上涨，但近1月过热会降级为等回调；低位但趋势未确认不会因为便宜自动入选。用于复盘、分批观察和仓位管理，不构成无条件买卖指令。",
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
                industries = load_industries_with_supplements(cur, trade_date, data_version)

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
                    with primary_events as (
                        select industry_id, event_date, event_title, event_summary, priority_rank
                        from industry_events_daily
                        where trade_date = %s and data_version = %s
                    ),
                    fallback_events as (
                        select industry_id, event_date, event_title, event_summary, priority_rank
                        from industry_events_daily
                        where trade_date <= %s and data_version = %s
                    )
                    select *
                    from primary_events
                    union all
                    select *
                    from fallback_events f
                    where not exists (
                        select 1
                        from primary_events p
                        where p.industry_id = f.industry_id
                    )
                    order by priority_rank asc, event_date desc
                    """,
                    (trade_date, data_version, trade_date, FALLBACK_DATA_VERSION),
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
                                [f"行业第 {index}", signal, fund["fund_type"], public_data_tag(fund["data_version"])],
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

                    timeline_events = [
                        {
                            "date": event["event_date"].isoformat(),
                            "title": event["event_title"],
                            "summary": event["event_summary"],
                        }
                        for event in events_by_industry.get(row["industry_id"], [])
                    ]
                    long_term_events = build_long_term_events(row, events_by_industry.get(row["industry_id"], []))
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
                        "timelineEvents": timeline_events,
                        "longTermEvents": long_term_events,
                        "eventImpactSummary": build_event_impact_summary(row, long_term_events),
                        "chartSeries": [
                            {"label": "趋势", "value": int(row["trend_score"] or 0)},
                            {"label": "资金", "value": int(row["capital_score"] or 0)},
                            {"label": "估值", "value": int(row["valuation_score"] or 0)},
                            {"label": "机会", "value": int(row["opportunity_score"] or 0)},
                        ],
                        "capitalHeatSeries": build_capital_heat_series(row),
                        "methodologyNotes": methodology_notes(),
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
                    return_3m = as_float_or_none(fund["return_3m"])
                    status_label = "持续关注"
                    if return_3m is not None and return_3m >= 15:
                        status_label = "强势跟踪"
                    elif return_3m is not None and return_3m >= 10:
                        status_label = "趋势改善"
                    latest_change = (
                        f"{fund['fund_name']}近 3 月收益为 {return_3m:.1f}%，当前适合持续观察。"
                        if return_3m is not None
                        else f"{fund['fund_name']}近 3 月收益待补，当前仅保留观察，不按 0% 参与强弱判断。"
                    )

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
                            latest_change,
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
