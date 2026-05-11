from __future__ import annotations

import json
from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import Any

from psycopg.rows import dict_row

from db.connection import get_connection
from db.queries.portfolio import DEFAULT_USER_ID
from jobs.shared import build_batch_id, log_job_end, log_job_start, resolve_trade_date

JOB_NAME = "portfolio_decision_snapshot_daily"
RISK_DISCLAIMER = "本提示仅用于持仓复盘和候选观察，不构成买入、卖出或收益承诺；请结合自身风险承受能力和基金公告复核。"
LONG_HOLD_KEYWORDS = ("QDII", "全球", "海外", "美股", "纳斯达克", "标普", "亚洲", "新兴市场")
HIGH_BETA_KEYWORDS = (
    "半导体",
    "芯片",
    "存储",
    "CPO",
    "人工智能",
    "AI",
    "算力",
    "创业板",
    "北证",
    "有色",
    "高端装备",
    "机器人",
    "军工",
    "商业航天",
    "卫星",
    "航天",
    "航空",
    "新能源",
    "电池",
    "光伏",
    "储能",
    "低空",
)
THEME_PROFILES = [
    {
        "decisionTheme": "全球/海外长期资产",
        "assetStyle": "long_hold",
        "industryId": "global-qdii",
        "keywords": LONG_HOLD_KEYWORDS,
        "intent": "偏长期持有，核心看海外中期趋势、汇率、估值与基金风格是否漂移。",
    },
    {
        "decisionTheme": "半导体",
        "assetStyle": "high_beta",
        "industryId": "semiconductor",
        "keywords": ("半导体", "芯片", "材料设备"),
        "intent": "高波动弹性仓位，核心看行业趋势、回撤、拥挤度和仓位上限。",
    },
    {
        "decisionTheme": "AI算力/CPO/人工智能",
        "assetStyle": "high_beta",
        "industryId": "cpo-optical-communication",
        "keywords": ("CPO", "光模块", "光通信", "通信设备", "高速互联", "AI", "算力"),
        "intent": "高弹性成长主题，短期波动大，需要趋势确认和回撤阈值。",
    },
    {
        "decisionTheme": "军工",
        "assetStyle": "high_beta",
        "industryId": "defense-military",
        "keywords": ("军工", "国防", "军民融合"),
        "intent": "政策与订单驱动型高波动主题，核心看订单兑现、估值修复和主题拥挤度。",
    },
    {
        "decisionTheme": "商业卫星/商业航天",
        "assetStyle": "high_beta",
        "industryId": "commercial-space",
        "keywords": ("商业卫星", "商业航天", "卫星互联网", "火箭", "低轨"),
        "intent": "强政策与产业催化主题，适合跟踪催化兑现，不适合只因热度追高。",
    },
    {
        "decisionTheme": "航天航空",
        "assetStyle": "high_beta",
        "industryId": "aerospace",
        "keywords": ("航天", "航空", "大飞机", "航空航天"),
        "intent": "订单和产业链景气驱动主题，重点观察中期趋势与回撤幅度。",
    },
    {
        "decisionTheme": "芯片存储",
        "assetStyle": "high_beta",
        "industryId": "memory-chip",
        "keywords": ("存储", "DRAM", "NAND", "芯片存储", "半导体存储"),
        "intent": "周期弹性和国产替代共振主题，重点看价格周期、库存周期和趋势持续性。",
    },
    {
        "decisionTheme": "新能源",
        "assetStyle": "high_beta",
        "industryId": "new-energy",
        "keywords": ("新能源", "新能源车", "电池", "锂电", "光伏", "储能", "风电"),
        "intent": "周期修复型成长主题，低估值需要资金和景气验证，不直接等同于买点。",
    },
    {
        "decisionTheme": "北证/小盘成长",
        "assetStyle": "high_beta",
        "industryId": None,
        "keywords": ("北证", "北交所", "北证50"),
        "intent": "小盘高波动主题，适合控制仓位并观察流动性和回撤。",
    },
    {
        "decisionTheme": "有色金属/周期资源",
        "assetStyle": "high_beta",
        "industryId": None,
        "keywords": ("有色", "金属", "矿业", "资源"),
        "intent": "周期属性较强，重点看商品价格、政策和回撤。",
    },
    {
        "decisionTheme": "高端装备",
        "assetStyle": "high_beta",
        "industryId": None,
        "keywords": ("高端装备", "装备"),
        "intent": "制造成长主题，重点看订单景气、产业趋势和波动。",
    },
]


def _num(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _round(value: float | None, digits: int = 4) -> float | None:
    return round(value, digits) if value is not None else None


def build_portfolio_snapshot(trade_date: date, user_id: str = DEFAULT_USER_ID) -> dict:
    positions = _load_positions(user_id)
    valuations = [_build_position_valuation(item, trade_date, user_id) for item in positions]
    summary = _build_summary(valuations)
    diagnosis = _build_diagnosis(valuations, summary)
    tips = _build_tips(valuations, summary, diagnosis)
    candidates = _build_candidates(valuations, trade_date, user_id)

    _persist_snapshot(
        trade_date=trade_date,
        user_id=user_id,
        valuations=valuations,
        summary=summary,
        diagnosis=diagnosis,
        tips=tips,
        candidates=candidates,
    )
    return {
        "tradeDate": trade_date.isoformat(),
        "holdingCount": len(valuations),
        "enhancedCount": summary["enhancedCount"],
        "tipCount": len(tips),
        "candidateCount": len(candidates),
    }


def _load_positions(user_id: str) -> list[dict]:
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select p.*,
                       fm.fund_id, fm.fund_type, fm.theme, fm.tracking_target, fm.fund_company,
                       m.return_1d, m.return_1m, m.return_3m, m.return_6m, m.max_drawdown,
                       m.volatility, m.aum, m.latest_nav, m.previous_nav, m.trade_date as metric_trade_date
                from portfolio_position_snapshot p
                left join fund_master fm on fm.fund_code = p.fund_code
                left join lateral (
                    select *
                    from fund_daily_metrics fdm
                    where fdm.fund_id = fm.fund_id
                    order by fdm.trade_date desc, fdm.updated_at desc
                    limit 1
                ) m on true
                where p.user_id = %s
                order by p.updated_at desc
                """,
                (user_id,),
            )
            return cur.fetchall()


def _build_position_valuation(row: dict, trade_date: date, user_id: str) -> dict:
    latest_nav = _num(row["latest_nav"])
    previous_nav = _num(row["previous_nav"])
    units = _num(row["units"])
    cost_nav = _num(row["cost_nav"])
    snapshot_market = _num(row["market_value_snapshot"])
    snapshot_day_profit = _num(row["day_profit_snapshot"])
    snapshot_holding_profit = _num(row["holding_profit_snapshot"])
    snapshot_holding_return = _num(row["holding_return_snapshot"])

    has_nav = latest_nav is not None and units is not None and units > 0
    if has_nav:
        market_value = units * latest_nav
        cost_value = units * cost_nav if cost_nav is not None and cost_nav > 0 else None
        day_profit = units * (latest_nav - previous_nav) if previous_nav is not None else snapshot_day_profit
        holding_profit = market_value - cost_value if cost_value is not None else snapshot_holding_profit
        holding_return = (holding_profit / cost_value * 100) if holding_profit is not None and cost_value else snapshot_holding_return
        data_mode = "nav"
        data_quality = "enhanced" if previous_nav is not None else "partial_nav"
    else:
        market_value = snapshot_market
        holding_profit = snapshot_holding_profit
        cost_value = market_value - holding_profit if market_value is not None and holding_profit is not None else None
        return_1d = _num(row["return_1d"])
        if market_value is not None and return_1d is not None and return_1d > -99.9:
            day_profit = market_value * (return_1d / 100) / (1 + return_1d / 100)
        else:
            day_profit = snapshot_day_profit
        holding_return = snapshot_holding_return
        data_mode = "snapshot_nav" if row["fund_code"] and return_1d is not None else "snapshot"
        data_quality = "enhanced" if row["fund_code"] and return_1d is not None else ("partial" if row["fund_code"] else "snapshot_only")

    profile = _classify_asset_profile(
        fund_name=row["fund_name"],
        theme=row["theme"] or "",
        fund_type=row["fund_type"] or "",
    )

    return {
        "userId": user_id,
        "tradeDate": trade_date,
        "positionId": row["position_id"],
        "fundId": row["fund_id"],
        "fundCode": row["fund_code"],
        "fundName": row["fund_name"],
        "theme": row["theme"] or "未匹配",
        "fundType": row["fund_type"] or "待匹配",
        "decisionTheme": profile["decisionTheme"],
        "assetStyle": profile["assetStyle"],
        "industryId": profile["industryId"],
        "assetIntent": profile["intent"],
        "latestNav": latest_nav,
        "previousNav": previous_nav,
        "return1d": _num(row["return_1d"]),
        "return1m": _num(row["return_1m"]),
        "return3m": _num(row["return_3m"]),
        "return6m": _num(row["return_6m"]),
        "maxDrawdown": _num(row["max_drawdown"]),
        "volatility": _num(row["volatility"]),
        "aum": _num(row["aum"]),
        "marketValue": _round(market_value),
        "costValue": _round(cost_value),
        "dayProfit": _round(day_profit),
        "holdingProfit": _round(holding_profit),
        "holdingReturn": _round(holding_return),
        "dataMode": data_mode,
        "dataQuality": data_quality,
    }


def _classify_asset_profile(fund_name: str, theme: str, fund_type: str) -> dict:
    text = f"{fund_name} {theme} {fund_type}".upper()
    for profile in THEME_PROFILES:
        if any(str(keyword).upper() in text for keyword in profile["keywords"]):
            return {
                "decisionTheme": profile["decisionTheme"],
                "assetStyle": profile["assetStyle"],
                "industryId": profile["industryId"],
                "intent": profile["intent"],
            }
    return {
        "decisionTheme": theme or "自选基金",
        "assetStyle": "core_or_unclear",
        "industryId": None,
        "intent": "缺少明确主题画像，先按普通自选基金复盘，重点补齐持仓、行业和费率证据。",
    }


def _build_summary(valuations: list[dict]) -> dict:
    total_market = sum(item["marketValue"] for item in valuations if item["marketValue"] is not None)
    total_cost = sum(item["costValue"] for item in valuations if item["costValue"] is not None)
    total_day_profit = sum(item["dayProfit"] for item in valuations if item["dayProfit"] is not None)
    total_holding_profit = sum(item["holdingProfit"] for item in valuations if item["holdingProfit"] is not None)
    market_value_unknown_count = sum(1 for item in valuations if item["marketValue"] is None)
    cost_value_unknown_count = sum(1 for item in valuations if item["costValue"] is None)
    day_profit_unknown_count = sum(1 for item in valuations if item["dayProfit"] is None)
    holding_profit_unknown_count = sum(1 for item in valuations if item["holdingProfit"] is None)
    enhanced_count = sum(1 for item in valuations if item["dataQuality"] == "enhanced")
    partial_count = sum(1 for item in valuations if item["dataQuality"] in {"partial", "partial_nav"})
    snapshot_only_count = sum(1 for item in valuations if item["dataQuality"] == "snapshot_only")

    return {
        "totalMarketValue": _round(total_market),
        "totalCostValue": _round(total_cost),
        "totalDayProfit": _round(total_day_profit),
        "totalHoldingProfit": _round(total_holding_profit),
        "holdingCount": len(valuations),
        "enhancedCount": enhanced_count,
        "quality": {
            "enhancedCount": enhanced_count,
            "partialCount": partial_count,
            "snapshotOnlyCount": snapshot_only_count,
            "enhancedRatio": _round(enhanced_count / len(valuations) * 100, 2) if valuations else 0,
            "marketValueUnknownCount": market_value_unknown_count,
            "costValueUnknownCount": cost_value_unknown_count,
            "dayProfitUnknownCount": day_profit_unknown_count,
            "holdingProfitUnknownCount": holding_profit_unknown_count,
        },
    }


def _build_diagnosis(valuations: list[dict], summary: dict) -> dict:
    industry_contexts = _load_industry_contexts()
    total_market = summary["totalMarketValue"] or 0
    theme_values: dict[str, float] = defaultdict(float)
    fund_type_values: dict[str, float] = defaultdict(float)
    decision_theme_values: dict[str, float] = defaultdict(float)
    unknown_market_value_count = 0
    for item in valuations:
        if item["marketValue"] is None:
            unknown_market_value_count += 1
            continue
        market_value = item["marketValue"]
        theme_values[item["theme"] or "未匹配"] += market_value
        fund_type_values[item["fundType"] or "待匹配"] += market_value
        decision_theme_values[item["decisionTheme"] or "未分类"] += market_value

    theme_exposure = [
        {"theme": theme, "marketValue": _round(value), "ratio": _round(value / total_market * 100, 2) if total_market else 0}
        for theme, value in sorted(theme_values.items(), key=lambda pair: pair[1], reverse=True)
    ]
    fund_type_exposure = [
        {"fundType": fund_type, "marketValue": _round(value), "ratio": _round(value / total_market * 100, 2) if total_market else 0}
        for fund_type, value in sorted(fund_type_values.items(), key=lambda pair: pair[1], reverse=True)
    ]
    decision_theme_exposure = [
        {"theme": theme, "marketValue": _round(value), "ratio": _round(value / total_market * 100, 2) if total_market else 0}
        for theme, value in sorted(decision_theme_values.items(), key=lambda pair: pair[1], reverse=True)
    ]
    qdii_value = sum(
        item["marketValue"]
        for item in valuations
        if item["marketValue"] is not None and ("QDII" in (item["fundType"] or "").upper() or "全球" in item["fundName"] or "海外" in item["fundName"])
    )
    known_market_valuations = [item for item in valuations if item["marketValue"] is not None]
    largest = max(known_market_valuations, key=lambda item: item["marketValue"], default=None)
    enriched = [_attach_decision_evidence(item, industry_contexts, total_market) for item in valuations]
    long_hold_review = [item for item in enriched if item["assetStyle"] == "long_hold"]
    high_beta_review = [item for item in enriched if item["assetStyle"] == "high_beta"]
    trend_watch_list = [item for item in enriched if item["decisionLevel"] in {"阶段转弱", "趋势破坏"}]
    industry_evidence = _build_industry_evidence_summary(industry_contexts, enriched)

    return {
        "themeExposure": theme_exposure,
        "fundTypeExposure": fund_type_exposure,
        "decisionThemeExposure": decision_theme_exposure,
        "qdiiRatio": _round(qdii_value / total_market * 100, 2) if total_market else 0,
        "largestPosition": {
            "fundName": largest["fundName"],
            "fundCode": largest["fundCode"],
            "ratio": _round(largest["marketValue"] / total_market * 100, 2) if total_market else 0,
        } if largest else None,
        "longHoldReview": long_hold_review,
        "highBetaReview": high_beta_review,
        "trendWatchList": trend_watch_list,
        "industryEvidence": industry_evidence,
        "decisionMethodology": {
            "version": "portfolio-decision-v2",
            "summary": "先看数据质量，再看基金多周期趋势、风险回撤、资产意图、行业/主题证据和组合仓位，不用单日涨跌直接判断趋势破坏。",
            "levels": {
                "短期波动": "单日或短期波动触发，只提示观察，不等于趋势变坏。",
                "阶段转弱": "近 1 月或近 3 月走弱，并伴随高波动/高回撤或行业证据不足。",
                "趋势破坏": "基金多周期走弱，同时行业趋势或资金/估值证据也偏弱，才进入更强风险提示。",
            },
        },
        "dataQuality": {**summary["quality"], "marketValueUnknownCount": unknown_market_value_count},
    }


def _load_industry_contexts() -> dict[str, dict]:
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select im.industry_id, im.industry_name, im.display_name,
                       m.performance_5d, m.performance_20d, m.performance_60d,
                       m.trend_score, m.capital_score, m.valuation_score, m.risk_score, m.risk_level,
                       o.opportunity_score, o.label, o.summary
                from industry_master im
                left join lateral (
                    select *
                    from industry_daily_metrics x
                    where x.industry_id = im.industry_id
                    order by x.trade_date desc, x.updated_at desc
                    limit 1
                ) m on true
                left join lateral (
                    select *
                    from industry_opportunity_daily x
                    where x.industry_id = im.industry_id
                    order by x.trade_date desc, x.updated_at desc
                    limit 1
                ) o on true
                """
            )
            rows = cur.fetchall()

    return {
        row["industry_id"]: {
            "industryId": row["industry_id"],
            "industryName": row["display_name"] or row["industry_name"],
            "performance5d": _num(row["performance_5d"]),
            "performance20d": _num(row["performance_20d"]),
            "performance60d": _num(row["performance_60d"]),
            "trendScore": _num(row["trend_score"]),
            "capitalScore": _num(row["capital_score"]),
            "valuationScore": _num(row["valuation_score"]),
            "riskScore": _num(row["risk_score"]),
            "riskLevel": row["risk_level"],
            "opportunityScore": _num(row["opportunity_score"]),
            "label": row["label"],
            "summary": row["summary"],
            "evidenceStatus": "available" if row["trend_score"] is not None or row["opportunity_score"] is not None else "missing",
        }
        for row in rows
    }


def _attach_decision_evidence(item: dict, industry_contexts: dict[str, dict], total_market: float) -> dict:
    industry_context = industry_contexts.get(item.get("industryId") or "") if item.get("industryId") else None
    position_ratio = _round(item["marketValue"] / total_market * 100, 2) if item["marketValue"] is not None and total_market else 0
    decision = _evaluate_position_decision(item, industry_context, position_ratio)
    review = _build_review_base(item)
    review.update(
        {
            "positionRatio": position_ratio,
            "assetStyle": item["assetStyle"],
            "decisionTheme": item["decisionTheme"],
            "assetIntent": item["assetIntent"],
            "industryContext": industry_context,
            **decision,
        }
    )
    return review


def _evaluate_position_decision(item: dict, industry_context: dict | None, position_ratio: float) -> dict:
    return_1d = item.get("return1d")
    return_1m = item.get("return1m")
    return_3m = item.get("return3m")
    return_6m = item.get("return6m")
    max_drawdown = item.get("maxDrawdown")
    volatility = item.get("volatility")

    trend_points = 0
    risk_points = 0
    industry_points = 0
    positive_points = 0
    reasons: list[str] = []
    missing: list[str] = []
    risk_vetoes: list[str] = []

    if return_1d is not None and return_1d <= -2:
        risk_points += 1
        reasons.append(f"昨日涨跌 {return_1d:.2f}%，属于短期压力。")
    if return_1m is not None:
        if return_1m <= -6:
            trend_points += 1
            reasons.append(f"近 1 月 {return_1m:.2f}%，短期趋势偏弱。")
        elif return_1m >= 6:
            positive_points += 1
            reasons.append(f"近 1 月 {return_1m:.2f}%，短期趋势仍有支撑。")
    else:
        missing.append("近 1 月收益")

    if return_3m is not None:
        if return_3m <= -10:
            trend_points += 2
            reasons.append(f"近 3 月 {return_3m:.2f}%，阶段趋势明显偏弱。")
        elif return_3m >= 12:
            positive_points += 2
            reasons.append(f"近 3 月 {return_3m:.2f}%，中期趋势仍偏强。")
    else:
        missing.append("近 3 月收益")

    if return_6m is not None:
        if return_6m <= -10:
            trend_points += 1
            reasons.append(f"近 6 月 {return_6m:.2f}%，中期趋势需要警惕。")
        elif return_6m >= 10:
            positive_points += 1
            reasons.append(f"近 6 月 {return_6m:.2f}%，中期表现仍有延续。")

    if max_drawdown is not None and max_drawdown <= -12:
        risk_points += 1
        reasons.append(f"最大回撤 {max_drawdown:.2f}%，已进入控仓观察区。")
        if max_drawdown <= -18:
            risk_points += 1
            risk_vetoes.append("最大回撤超过 -18%，新增仓位需要等待趋势修复。")
        if max_drawdown <= -25:
            risk_points += 2
            risk_vetoes.append("最大回撤超过 -25%，触发强风控复盘，不应等到此时才开始减仓判断。")
    if volatility is not None and volatility >= 28:
        risk_points += 1
        reasons.append(f"波动率 {volatility:.2f}%，属于高波动。")

    if industry_context and industry_context.get("evidenceStatus") == "available":
        trend_score = industry_context.get("trendScore")
        capital_score = industry_context.get("capitalScore")
        valuation_score = industry_context.get("valuationScore")
        performance20d = industry_context.get("performance20d")
        if trend_score is not None:
            if trend_score < 45:
                industry_points += 2
                reasons.append(f"行业趋势分 {trend_score:.0f}，行业证据偏弱。")
            elif trend_score >= 65:
                positive_points += 1
                reasons.append(f"行业趋势分 {trend_score:.0f}，行业趋势仍有支撑。")
        if capital_score is not None and capital_score < 45:
            industry_points += 1
            reasons.append(f"资金强度分 {capital_score:.0f}，资金侧偏弱。")
        if performance20d is not None and performance20d <= -5:
            industry_points += 1
            reasons.append(f"行业近 20 日 {performance20d:.2f}%，主题表现偏弱。")
        if valuation_score is not None and valuation_score >= 70 and trend_points:
            positive_points += 1
            reasons.append(f"估值分 {valuation_score:.0f}，下跌后仍可能有左侧观察价值。")
    else:
        missing.append("行业趋势/资金/估值证据")
        reasons.append("行业证据暂缺，本次判断不会把短期涨跌直接升级为趋势破坏。")

    position_limit = _position_limit_for_item(item)
    if position_ratio >= position_limit * 1.35:
        risk_points += 2
        risk_vetoes.append(f"单只占比 {position_ratio:.2f}% 明显超过建议上限 {position_limit:.0f}%，优先控仓而不是加仓。")
        reasons.append(f"单只占比 {position_ratio:.2f}%，集中度偏高。")
    elif position_ratio >= position_limit:
        risk_points += 1
        risk_vetoes.append(f"单只占比已达到建议上限 {position_limit:.0f}% 附近，新增资金需要谨慎。")
        reasons.append(f"单只占比 {position_ratio:.2f}%，接近仓位上限。")

    if trend_points >= 3 and industry_points >= 2:
        decision_level = "趋势破坏"
        action = "多周期趋势与行业证据同时偏弱，适合重点复盘是否降低仓位；执行前仍需结合你的长期目标和成本。"
    elif trend_points >= 2 or (trend_points >= 1 and risk_points >= 2):
        decision_level = "阶段转弱"
        action = "阶段趋势或风险压力上升，适合暂停加仓、设置减仓/控仓阈值，并观察后续 1 到 2 周是否修复。"
    elif risk_points >= 1 and trend_points == 0:
        decision_level = "短期波动"
        action = "短期波动触发提醒，但证据不足以判断趋势变坏；适合观察而非立刻下结论。"
    elif positive_points >= 2:
        decision_level = "趋势仍有支撑"
        action = "基金或行业中期证据仍有支撑，适合继续按原计划复盘，避免被单日波动影响。"
    else:
        decision_level = "继续观察"
        action = "证据尚不充分，继续跟踪基金净值、行业趋势、回撤和费用。"

    confidence = "高" if industry_context and not missing and (trend_points + risk_points + positive_points) >= 3 else "中" if len(missing) <= 1 else "低"
    score = max(0, min(100, 55 + positive_points * 8 - trend_points * 12 - risk_points * 8 - industry_points * 10))

    if item["assetStyle"] == "long_hold" and decision_level in {"短期波动", "阶段转弱"}:
        action = f"{action} 这是长期/海外资产，优先确认海外市场和汇率因素，不因单日净值延迟频繁操作。"
    if item["assetStyle"] == "high_beta" and decision_level in {"阶段转弱", "趋势破坏", "短期波动"}:
        action = f"{action} 这是高波动主题，仓位管理优先级高于追求短期反弹。"

    operation = _build_operation_signal(
        item=item,
        decision_level=decision_level,
        score=score,
        position_ratio=position_ratio,
        trend_points=trend_points,
        risk_points=risk_points,
        positive_points=positive_points,
        missing=missing,
        risk_vetoes=risk_vetoes,
    )
    committee = _build_decision_committee(
        item=item,
        industry_context=industry_context,
        position_ratio=position_ratio,
        position_limit=position_limit,
        decision_level=decision_level,
        score=score,
        trend_points=trend_points,
        risk_points=risk_points,
        positive_points=positive_points,
        risk_vetoes=risk_vetoes,
    )

    return {
        "decisionLevel": decision_level,
        "decisionScore": _round(score, 2),
        "confidence": confidence,
        "evidenceSummary": reasons[:6],
        "missingEvidence": missing,
        "riskVetoes": risk_vetoes,
        "positionLimit": position_limit,
        **committee,
        **operation,
        "action": action,
        "trendLabel": decision_level,
    }


def _position_limit_for_item(item: dict) -> float:
    asset_style = item.get("assetStyle")
    if asset_style == "high_beta":
        return 8.0
    if asset_style == "long_hold":
        return 18.0
    return 12.0


def _build_decision_committee(
    *,
    item: dict,
    industry_context: dict | None,
    position_ratio: float,
    position_limit: float,
    decision_level: str,
    score: float,
    trend_points: int,
    risk_points: int,
    positive_points: int,
    risk_vetoes: list[str],
) -> dict:
    return_1m = item.get("return1m")
    return_3m = item.get("return3m")
    return_6m = item.get("return6m")
    max_drawdown = item.get("maxDrawdown")
    volatility = item.get("volatility")
    trend_score = industry_context.get("trendScore") if industry_context else None

    aggressive_case = "趋势证据不足，暂不支持进攻。"
    if positive_points >= 3 and return_3m is not None and return_6m is not None:
        aggressive_case = f"近3月 {return_3m:.2f}%、近6月 {return_6m:.2f}%，中期趋势仍有进攻价值。"
    elif return_1m is not None and return_1m >= 8:
        aggressive_case = f"近1月 {return_1m:.2f}%，短线动量仍强，但需要确认不是追高。"

    neutral_case = "维持观察，等待更多行业与净值证据。"
    if trend_score is not None:
        neutral_case = f"行业趋势分 {trend_score:.0f}，结合仓位 {position_ratio:.2f}% 和波动来决定是否只持有不加仓。"
    if position_ratio >= position_limit:
        neutral_case = f"仓位 {position_ratio:.2f}% 已接近/超过建议上限 {position_limit:.0f}%，即使趋势强也优先做再平衡。"

    conservative_case = "暂无硬性风控否决，但仍需设置回撤和仓位上限。"
    if risk_vetoes:
        conservative_case = risk_vetoes[0]
    elif max_drawdown is not None and max_drawdown <= -12:
        conservative_case = f"最大回撤 {max_drawdown:.2f}% 已进入观察区，新增仓位需要更高确认度。"
    elif volatility is not None and volatility >= 28:
        conservative_case = f"波动率 {volatility:.2f}% 偏高，分批和仓位上限比追求收益更重要。"

    rating = "Hold"
    rating_label = "持有"
    if risk_vetoes and position_ratio >= position_limit:
        rating = "Underweight"
        rating_label = "降配"
    elif decision_level == "趋势破坏":
        rating = "Underweight"
        rating_label = "降配"
    elif decision_level == "阶段转弱":
        rating = "Hold"
        rating_label = "暂停加仓"
    elif positive_points >= 4 and score >= 75 and position_ratio < position_limit * 0.75 and not risk_vetoes:
        rating = "Overweight"
        rating_label = "小幅增配观察"
    elif positive_points >= 2 and not risk_vetoes:
        rating = "Hold"
        rating_label = "持有"

    if trend_points >= 3 and risk_points >= 3:
        rating = "Sell"
        rating_label = "退出/大幅降配复盘"

    return {
        "portfolioRating": rating,
        "portfolioRatingLabel": rating_label,
        "decisionCommittee": {
            "aggressiveCase": aggressive_case,
            "neutralCase": neutral_case,
            "conservativeCase": conservative_case,
            "finalView": f"{rating_label}：先尊重趋势证据，但由仓位上限和风险否决项决定是否能加仓。",
        },
    }


def _build_operation_signal(
    *,
    item: dict,
    decision_level: str,
    score: float,
    position_ratio: float,
    trend_points: int,
    risk_points: int,
    positive_points: int,
    missing: list[str],
    risk_vetoes: list[str],
) -> dict:
    asset_style = item.get("assetStyle")
    return_1m = item.get("return1m")
    return_3m = item.get("return3m")

    if risk_vetoes and position_ratio >= _position_limit_for_item(item):
        signal = "控仓优先"
        signal_strength = "high"
        buy_watch_score = min(score, 35)
        reason = risk_vetoes[0]
    elif missing and len(missing) >= 2:
        signal = "数据不足，先补证据"
        signal_strength = "low"
        buy_watch_score = min(score, 45)
        reason = "关键证据缺口较多，不适合直接形成配置判断。"
    elif decision_level == "趋势破坏":
        signal = "减仓复盘"
        signal_strength = "high"
        buy_watch_score = min(score, 30)
        reason = "多周期趋势和风险证据偏弱，优先复盘是否降低仓位。"
    elif decision_level == "阶段转弱":
        signal = "暂停加仓"
        signal_strength = "medium"
        buy_watch_score = min(score, 45)
        reason = "阶段趋势偏弱，先观察 1 到 2 周能否修复。"
    elif asset_style == "high_beta" and return_1m is not None and return_1m >= 15:
        signal = "不追高，等回调观察"
        signal_strength = "medium"
        buy_watch_score = min(score, 62)
        reason = "高波动主题短期涨幅较高，容易出现快速回撤。"
    elif decision_level == "趋势仍有支撑" and score >= 75 and position_ratio < 15:
        signal = "分批配置观察"
        signal_strength = "medium"
        buy_watch_score = min(88, score)
        reason = "中期证据仍有支撑且仓位不高，可进入分批配置观察池。"
    elif decision_level == "短期波动" and positive_points >= 2:
        signal = "回调观察"
        signal_strength = "medium"
        buy_watch_score = min(72, score)
        reason = "短期有波动，但中期证据仍可观察，适合等待回调确认。"
    elif asset_style == "long_hold" and score >= 65:
        signal = "继续持有观察"
        signal_strength = "medium"
        buy_watch_score = min(78, score)
        reason = "长期资产不因单日波动频繁调整，优先看中期趋势是否变坏。"
    elif trend_points == 0 and risk_points <= 1 and (return_3m is not None and return_3m >= 5):
        signal = "买入观察"
        signal_strength = "low"
        buy_watch_score = min(75, score)
        reason = "趋势未明显破坏，可进入观察池，但仍需结合估值、费用和仓位上限。"
    else:
        signal = "继续观察"
        signal_strength = "low"
        buy_watch_score = score
        reason = "证据未达到明确配置或风控阈值，继续跟踪。"

    return {
        "operationSignal": signal,
        "signalStrength": signal_strength,
        "buyWatchScore": _round(buy_watch_score, 2),
        "operationReason": reason,
        "operationDisclaimer": "这是买入观察和持仓复盘信号，不是无条件买卖指令；执行前需结合个人风险承受能力、仓位上限和基金公告。",
    }


def _build_industry_evidence_summary(industry_contexts: dict[str, dict], reviews: list[dict]) -> list[dict]:
    used_ids = {item.get("industryContext", {}).get("industryId") for item in reviews if item.get("industryContext")}
    summary = []
    for industry_id in used_ids:
        context = industry_contexts.get(industry_id or "")
        if context:
            summary.append(context)
    return sorted(summary, key=lambda item: item.get("opportunityScore") or 0, reverse=True)


def _contains_keyword(item: dict, keywords: tuple[str, ...]) -> bool:
    text = f"{item.get('fundName') or ''} {item.get('theme') or ''} {item.get('fundType') or ''}".upper()
    return any(keyword.upper() in text for keyword in keywords)


def _is_long_hold_asset(item: dict) -> bool:
    return _contains_keyword(item, LONG_HOLD_KEYWORDS)


def _is_high_beta_asset(item: dict) -> bool:
    return _contains_keyword(item, HIGH_BETA_KEYWORDS)


def _is_trend_deteriorating(item: dict) -> bool:
    return_1d = item.get("return1d")
    return_1m = item.get("return1m")
    return_3m = item.get("return3m")
    return bool(
        (return_1d is not None and return_1d <= -2.0)
        or (return_1m is not None and return_1m <= -6.0)
        or (return_3m is not None and return_3m <= -10.0)
    )


def _trend_label(item: dict) -> str:
    return_1d = item.get("return1d")
    return_1m = item.get("return1m")
    return_3m = item.get("return3m")
    max_drawdown = item.get("maxDrawdown")
    volatility = item.get("volatility")

    if return_3m is not None and return_3m >= 15 and (return_1d is None or return_1d > -2):
        return "中期趋势仍强"
    if _is_trend_deteriorating(item):
        return "趋势转弱观察"
    if volatility is not None and volatility >= 25:
        return "波动偏高"
    if max_drawdown is not None and max_drawdown <= -18:
        return "回撤压力偏高"
    return "继续观察"


def _build_review_base(item: dict) -> dict:
    return {
        "fundCode": item.get("fundCode"),
        "fundName": item.get("fundName"),
        "theme": item.get("theme"),
        "marketValue": item.get("marketValue"),
        "positionRatio": None,
        "return1d": item.get("return1d"),
        "return1m": item.get("return1m"),
        "return3m": item.get("return3m"),
        "maxDrawdown": item.get("maxDrawdown"),
        "volatility": item.get("volatility"),
        "trendLabel": _trend_label(item),
    }


def _build_long_hold_review(item: dict) -> dict:
    review = _build_review_base(item)
    if _is_trend_deteriorating(item):
        action = "长期资产但趋势走弱，先暂停加仓，观察海外市场、汇率和近 1 月净值是否继续下行。"
    elif item.get("return3m") is not None and item["return3m"] >= 15:
        action = "长期资产趋势仍在，可继续长持观察；不因单日波动轻易改变长期仓位。"
    else:
        action = "长期资产适合按月复盘，不用被单日涨跌牵着走；重点看中期趋势和基金风格是否漂移。"
    review["action"] = action
    return review


def _build_high_beta_review(item: dict) -> dict:
    review = _build_review_base(item)
    if _is_trend_deteriorating(item):
        action = "高波动主题已出现转弱信号，适合设置减仓/控仓观察阈值，避免越跌越集中。"
    elif item.get("return3m") is not None and item["return3m"] >= 12:
        action = "高波动主题短中期较强，但容易快速回撤；适合只保留计划内仓位，不因上涨追高。"
    else:
        action = "高波动主题暂不强势，适合小仓观察或等待趋势重新确认。"
    review["action"] = action
    return review


def _build_trend_watch_item(item: dict) -> dict:
    review = _build_review_base(item)
    review["action"] = "趋势转弱时先复盘原因：是主题短期回撤、基金风格问题，还是持仓行业基本面变坏；再决定是否降低仓位。"
    return review


def _build_tips(valuations: list[dict], summary: dict, diagnosis: dict) -> list[dict]:
    tips: list[dict] = []
    quality = summary["quality"]
    if quality["enhancedRatio"] < 60 and summary["holdingCount"] > 0:
        tips.append(
            _tip(
                "data_quality",
                "medium",
                "先刷新真实净值，再看组合结论",
                f"当前仅 {quality['enhancedRatio']}% 持仓匹配到真实净值，截图金额仍可看资产分布，但昨日涨跌和持有收益需要更多盘后净值确认。",
                quality,
            )
        )

    top_theme = diagnosis["decisionThemeExposure"][0] if diagnosis.get("decisionThemeExposure") else (diagnosis["themeExposure"][0] if diagnosis["themeExposure"] else None)
    if top_theme and top_theme["ratio"] >= 50:
        tips.append(
            _tip(
                "theme_concentration",
                "high",
                "主题集中度偏高，适合先做压力观察",
                f"{top_theme['theme']} 占组合约 {top_theme['ratio']}%，后续可重点观察该主题回撤、估值和拥挤度，不宜只因短期上涨继续加重集中度。",
                top_theme,
            )
        )

    long_hold_items = diagnosis.get("longHoldReview") or []
    resilient_long_hold = [item for item in long_hold_items if item.get("decisionLevel") == "趋势仍有支撑"]
    weak_long_hold = [item for item in long_hold_items if item.get("decisionLevel") in {"阶段转弱", "趋势破坏"}]
    if resilient_long_hold:
        names = "、".join(item["fundName"] for item in resilient_long_hold[:3])
        tips.append(
            _tip(
                "long_hold_overseas",
                "low",
                "美股/QDII 长期仓位可偏耐心复盘",
                f"{names} 中期趋势仍强，若你的目标是长期持有，可重点观察趋势是否变坏、汇率和估值，而不是因单日波动频繁调整。",
                {"items": resilient_long_hold[:5]},
            )
        )
    if weak_long_hold:
        names = "、".join(item["fundName"] for item in weak_long_hold[:3])
        tips.append(
            _tip(
                "long_hold_trend_break",
                "medium",
                "长期仓位也要看趋势是否变坏",
                f"{names} 出现短期或中期转弱信号，长期持有不等于不复盘；建议先暂停加仓，观察近 1 月净值和海外市场是否继续走弱。",
                {"items": weak_long_hold[:5]},
            )
        )

    high_beta_items = diagnosis.get("highBetaReview") or []
    pressure_beta = [item for item in high_beta_items if item.get("decisionLevel") in {"阶段转弱", "趋势破坏", "短期波动"}]
    hot_beta = [item for item in high_beta_items if item.get("decisionLevel") == "趋势仍有支撑"]
    if pressure_beta:
        names = "、".join(item["fundName"] for item in pressure_beta[:3])
        tips.append(
            _tip(
                "high_beta_control",
                "high",
                "半导体/CPO/AI 等高波动主题适合控仓复盘",
                f"{names} 属于高波动主题且出现短期波动、阶段转弱或回撤压力；如果本来只是弹性仓位，可考虑设置减仓或控仓阈值，而不是按长期底仓处理。",
                {"items": pressure_beta[:5]},
            )
        )
    elif hot_beta:
        names = "、".join(item["fundName"] for item in hot_beta[:3])
        tips.append(
            _tip(
                "high_beta_hot",
                "medium",
                "高波动主题短期强势，注意回调",
                f"{names} 中期涨幅较强，但半导体/CPO/AI 这类主题回撤速度也快；适合高亮观察，不建议因上涨继续放大仓位。",
                {"items": hot_beta[:5]},
            )
        )

    if diagnosis["qdiiRatio"] >= 40:
        tips.append(
            _tip(
                "qdii_exposure",
                "medium",
                "QDII/海外暴露较高，注意净值延迟和汇率因素",
                f"QDII 或海外相关持仓占比约 {diagnosis['qdiiRatio']}%，盘后净值可能滞后，单日收益解释需要结合海外市场和汇率。",
                {"qdiiRatio": diagnosis["qdiiRatio"]},
            )
        )

    largest = diagnosis.get("largestPosition")
    if largest and largest["ratio"] >= 25:
        tips.append(
            _tip(
                "single_position",
                "medium",
                "单只基金占比较高，适合设置复盘阈值",
                f"{largest['fundName']} 占组合约 {largest['ratio']}%，建议后续围绕回撤、主题暴露和费率规则做观察，不输出直接买卖指令。",
                largest,
            )
        )

    hot_items = [item for item in valuations if item["return1d"] is not None and item["return1d"] >= 3]
    if hot_items:
        names = "、".join(item["fundName"] for item in hot_items[:3])
        tips.append(
            _tip(
                "short_term_heat",
                "low",
                "短期涨幅较强，只作为观察线索",
                f"{names} 昨日涨跌幅较高，适合高亮为短期热度线索，但不能单独等同于值得买。",
                {"items": [{"fundCode": item["fundCode"], "return1d": item["return1d"]} for item in hot_items[:5]]},
            )
        )

    weak_items = [item for item in valuations if item["maxDrawdown"] is not None and item["maxDrawdown"] <= -20]
    if weak_items:
        names = "、".join(item["fundName"] for item in weak_items[:3])
        tips.append(
            _tip(
                "drawdown_watch",
                "medium",
                "部分基金历史回撤偏深，适合纳入风险复盘",
                f"{names} 的历史最大回撤偏深，适合结合个人风险承受能力和持有周期复核。",
                {"items": [{"fundCode": item["fundCode"], "maxDrawdown": item["maxDrawdown"]} for item in weak_items[:5]]},
            )
        )

    if not tips:
        tips.append(
            _tip(
                "normal_review",
                "low",
                "组合暂无强风险信号，继续补数据和观察",
                "当前组合未触发高集中度或高回撤提示；下一步重点是持续更新真实净值、费用规则和披露持仓。",
                {},
            )
        )
    return tips


def _tip(tip_type: str, severity: str, title: str, summary: str, evidence: dict) -> dict:
    return {
        "tipType": tip_type,
        "severity": severity,
        "title": title,
        "summary": summary,
        "evidence": evidence,
        "dataQuality": "computed",
        "riskDisclaimer": RISK_DISCLAIMER,
    }


def _build_candidates(valuations: list[dict], trade_date: date, user_id: str) -> list[dict]:
    held_codes = {item["fundCode"] for item in valuations if item["fundCode"]}
    major_themes = [item["theme"] for item in valuations if item["theme"] and item["theme"] != "未匹配"]
    if not major_themes:
        return []

    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select distinct on (fm.fund_id)
                    fm.fund_id, fm.fund_code, fm.fund_name, fm.theme, fm.fund_type,
                    fdm.return_1d, fdm.return_3m, fdm.max_drawdown, fdm.volatility, fdm.aum, fdm.trade_date
                from fund_master fm
                join lateral (
                    select *
                    from fund_daily_metrics m
                    where m.fund_id = fm.fund_id
                    order by m.trade_date desc, m.updated_at desc
                    limit 1
                ) fdm on true
                where fm.theme = any(%s)
                  and not (fm.fund_code = any(%s))
                order by fm.fund_id, fdm.aum desc nulls last, fdm.return_3m desc nulls last
                limit 12
                """,
                (major_themes, list(held_codes) or [""]),
            )
            rows = cur.fetchall()

    candidates = []
    for row in rows:
        candidates.append(
            {
                "candidateId": f"{user_id}-{trade_date.isoformat()}-{row['fund_id']}-same-theme",
                "fundId": row["fund_id"],
                "fundCode": row["fund_code"],
                "fundName": row["fund_name"],
                "sourceType": "same_theme_observation",
                "reason": f"同属 {row['theme']} 主题，可作为对照观察基金；用于比较费率、回撤、波动和规模，不代表买入建议。",
                "metrics": {
                    "theme": row["theme"],
                    "fundType": row["fund_type"],
                    "return1d": _num(row["return_1d"]),
                    "return3m": _num(row["return_3m"]),
                    "maxDrawdown": _num(row["max_drawdown"]),
                    "volatility": _num(row["volatility"]),
                    "aum": _num(row["aum"]),
                },
                "dataQuality": "snapshot",
                "riskDisclaimer": RISK_DISCLAIMER,
            }
        )
    return candidates


def _persist_snapshot(
    *,
    trade_date: date,
    user_id: str,
    valuations: list[dict],
    summary: dict,
    diagnosis: dict,
    tips: list[dict],
    candidates: list[dict],
) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            valuation_id = f"{user_id}-{trade_date.isoformat()}"
            cur.execute(
                """
                insert into portfolio_valuation_snapshot (
                    valuation_id, user_id, trade_date, total_market_value, total_cost_value,
                    total_day_profit, total_holding_profit, holding_count, enhanced_count,
                    summary_json, quality_json, created_at, updated_at
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, now(), now())
                on conflict (user_id, trade_date) do update
                set total_market_value = excluded.total_market_value,
                    total_cost_value = excluded.total_cost_value,
                    total_day_profit = excluded.total_day_profit,
                    total_holding_profit = excluded.total_holding_profit,
                    holding_count = excluded.holding_count,
                    enhanced_count = excluded.enhanced_count,
                    summary_json = excluded.summary_json,
                    quality_json = excluded.quality_json,
                    updated_at = now()
                """,
                (
                    valuation_id,
                    user_id,
                    trade_date,
                    summary["totalMarketValue"],
                    summary["totalCostValue"],
                    summary["totalDayProfit"],
                    summary["totalHoldingProfit"],
                    summary["holdingCount"],
                    summary["enhancedCount"],
                    json.dumps({"method": "snapshot_or_nav_enhanced"}, ensure_ascii=False),
                    json.dumps(summary["quality"], ensure_ascii=False),
                ),
            )

            cur.execute("delete from portfolio_position_valuation where user_id = %s and trade_date = %s", (user_id, trade_date))
            for item in valuations:
                cur.execute(
                    """
                    insert into portfolio_position_valuation (
                        user_id, trade_date, position_id, fund_code, fund_name, theme, fund_type,
                        latest_nav, previous_nav, return_1d, market_value, cost_value,
                        day_profit, holding_profit, holding_return, data_mode, data_quality,
                        created_at, updated_at
                    )
                    values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                    on conflict (user_id, trade_date, position_id) do update
                    set fund_code = excluded.fund_code,
                        fund_name = excluded.fund_name,
                        theme = excluded.theme,
                        fund_type = excluded.fund_type,
                        latest_nav = excluded.latest_nav,
                        previous_nav = excluded.previous_nav,
                        return_1d = excluded.return_1d,
                        market_value = excluded.market_value,
                        cost_value = excluded.cost_value,
                        day_profit = excluded.day_profit,
                        holding_profit = excluded.holding_profit,
                        holding_return = excluded.holding_return,
                        data_mode = excluded.data_mode,
                        data_quality = excluded.data_quality,
                        updated_at = now()
                    """,
                    (
                        user_id,
                        trade_date,
                        item["positionId"],
                        item["fundCode"],
                        item["fundName"],
                        item["theme"],
                        item["fundType"],
                        item["latestNav"],
                        item["previousNav"],
                        item["return1d"],
                        item["marketValue"],
                        item["costValue"],
                        item["dayProfit"],
                        item["holdingProfit"],
                        item["holdingReturn"],
                        item["dataMode"],
                        item["dataQuality"],
                    ),
                )

            diagnosis_id = f"{user_id}-{trade_date.isoformat()}-diagnosis"
            cur.execute(
                """
                insert into portfolio_diagnosis_snapshot (diagnosis_id, user_id, trade_date, diagnosis_json, created_at, updated_at)
                values (%s, %s, %s, %s::jsonb, now(), now())
                on conflict (user_id, trade_date) do update
                set diagnosis_json = excluded.diagnosis_json,
                    updated_at = now()
                """,
                (diagnosis_id, user_id, trade_date, json.dumps(diagnosis, ensure_ascii=False)),
            )

            cur.execute("delete from portfolio_decision_tip where user_id = %s and trade_date = %s", (user_id, trade_date))
            for index, tip in enumerate(tips, start=1):
                cur.execute(
                    """
                    insert into portfolio_decision_tip (
                        tip_id, user_id, trade_date, tip_type, severity, title, summary,
                        evidence_json, data_quality, risk_disclaimer, created_at, updated_at
                    )
                    values (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, now(), now())
                    """,
                    (
                        f"{user_id}-{trade_date.isoformat()}-tip-{index}",
                        user_id,
                        trade_date,
                        tip["tipType"],
                        tip["severity"],
                        tip["title"],
                        tip["summary"],
                        json.dumps(tip["evidence"], ensure_ascii=False),
                        tip["dataQuality"],
                        tip["riskDisclaimer"],
                    ),
                )

            cur.execute("delete from portfolio_candidate_fund where user_id = %s and trade_date = %s", (user_id, trade_date))
            for candidate in candidates:
                cur.execute(
                    """
                    insert into portfolio_candidate_fund (
                        candidate_id, user_id, trade_date, fund_id, fund_code, fund_name,
                        source_type, reason, metrics_json, data_quality, risk_disclaimer,
                        created_at, updated_at
                    )
                    values (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, now(), now())
                    on conflict (user_id, trade_date, fund_id, source_type) do update
                    set reason = excluded.reason,
                        metrics_json = excluded.metrics_json,
                        data_quality = excluded.data_quality,
                        risk_disclaimer = excluded.risk_disclaimer,
                        updated_at = now()
                    """,
                    (
                        candidate["candidateId"],
                        user_id,
                        trade_date,
                        candidate["fundId"],
                        candidate["fundCode"],
                        candidate["fundName"],
                        candidate["sourceType"],
                        candidate["reason"],
                        json.dumps(candidate["metrics"], ensure_ascii=False),
                        candidate["dataQuality"],
                        candidate["riskDisclaimer"],
                    ),
                )
        conn.commit()


def main() -> None:
    trade_date = resolve_trade_date()
    batch_id = build_batch_id(trade_date)
    log_job_start(JOB_NAME, batch_id, trade_date)
    try:
        result = build_portfolio_snapshot(trade_date)
    except Exception as exc:
        log_job_end(JOB_NAME, batch_id, trade_date, run_status="failed", error_message=str(exc))
        raise
    log_job_end(JOB_NAME, batch_id, trade_date, processed_count=result["holdingCount"])
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
