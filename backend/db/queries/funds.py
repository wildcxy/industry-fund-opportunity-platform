from psycopg.rows import dict_row

from db.connection import get_connection
from db.queries.fund_candidates import list_candidate_statuses


def normalize_aum_yi(value) -> float | None:
    if value is None:
        return None
    amount = float(value)
    if amount >= 1000000:
        return round(amount / 100000000.0, 4)
    return amount


def build_metric_quality(row: dict, data_source: str) -> dict:
    metric_fields = {
        "return1d": row["return_1d"],
        "return1m": row["return_1m"],
        "return3m": row["return_3m"],
        "return6m": row["return_6m"],
        "maxDrawdown": row["max_drawdown"],
        "volatility": row["volatility"],
        "aum": row["aum"],
        "latestNav": row["latest_nav"],
    }
    missing = [name for name, value in metric_fields.items() if value is None]
    if data_source == "采集失败":
        completeness = "failed"
    elif data_source in {"待采集", "采集中"}:
        completeness = "pending"
    elif missing:
        completeness = "partial"
    else:
        completeness = "complete"
    return {"dataCompleteness": completeness, "missingMetrics": missing}


def list_funds_snapshot() -> dict:
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select
                    fm.fund_id,
                    fm.fund_name,
                    fm.fund_code,
                    fm.fund_type,
                    fm.theme,
                    fm.tracking_target,
                    fm.fund_company,
                    fm.tradable_on_exchange,
                    fm.fee_rate,
                    fdm.return_1d,
                    fdm.return_1m,
                    fdm.return_3m,
                    fdm.return_6m,
                    fdm.max_drawdown,
                    fdm.volatility,
                    fdm.aum,
                    fdm.latest_nav,
                    fdm.previous_nav,
                    fdm.latest_nav_date,
                    fdm.previous_nav_date,
                    fdm.founded_years,
                    fdm.top_holdings_json,
                    fdm.concentration_label,
                    fdm.tracking_deviation_note,
                    fdm.trade_date,
                    fdm.data_version,
                    fdm.updated_at
                from fund_master fm
                join (
                    select distinct on (fund_id) *
                    from fund_daily_metrics
                    order by fund_id, trade_date desc, updated_at desc
                ) fdm on fdm.fund_id = fm.fund_id
                order by fm.theme, fm.fund_code
                """
            )
            rows = cur.fetchall()

            cur.execute(
                """
                select distinct on (fund_id)
                    fund_id,
                    subscription_fee_rate,
                    purchase_fee_rate,
                    management_fee_rate,
                    custodian_fee_rate,
                    sales_service_fee_rate,
                    quality_status,
                    fee_rule_text
                from fund_fee_rule
                order by fund_id, trade_date desc, updated_at desc
                """
            )
            fee_rule_rows = cur.fetchall()

            cur.execute(
                """
                select distinct on (fund_id, holding_days)
                    fund_id,
                    holding_days,
                    total_cost_rate,
                    subscription_cost_rate,
                    redemption_cost_rate,
                    management_cost_rate,
                    custodian_cost_rate,
                    sales_service_cost_rate,
                    is_redemption_fee_free
                from fund_holding_cost_snapshot
                order by fund_id, holding_days, trade_date desc, updated_at desc
                """
            )
            holding_cost_rows = cur.fetchall()

            cur.execute(
                """
                select fund_id, min(min_holding_days) filter (where is_free_threshold = true) as free_after_days
                from fund_redemption_fee_ladder
                group by fund_id
                """
            )
            redemption_free_rows = cur.fetchall()

            cur.execute(
                """
                select
                    ifm.fund_id,
                    coalesce(im.display_name, im.industry_name, ifm.industry_id) as theme_name
                from industry_fund_mapping ifm
                left join industry_master im on im.industry_id = ifm.industry_id
                where ifm.mapping_type in ('top10-auto', 'theme', 'user-selected')
                """
            )
            mapped_theme_rows = cur.fetchall()

    fee_rule_map = {
        row["fund_id"]: {
            "subscriptionFeeRate": float(row["subscription_fee_rate"]) if row["subscription_fee_rate"] is not None else None,
            "purchaseFeeRate": float(row["purchase_fee_rate"]) if row["purchase_fee_rate"] is not None else None,
            "managementFeeRate": float(row["management_fee_rate"]) if row["management_fee_rate"] is not None else None,
            "custodianFeeRate": float(row["custodian_fee_rate"]) if row["custodian_fee_rate"] is not None else None,
            "salesServiceFeeRate": float(row["sales_service_fee_rate"]) if row["sales_service_fee_rate"] is not None else None,
            "qualityStatus": row["quality_status"],
            "feeRuleText": row["fee_rule_text"],
        }
        for row in fee_rule_rows
    }

    holding_cost_map: dict[str, list[dict]] = {}
    for row in holding_cost_rows:
        holding_cost_map.setdefault(row["fund_id"], []).append(
            {
                "holdingDays": row["holding_days"],
                "totalCostRate": float(row["total_cost_rate"]) if row["total_cost_rate"] is not None else None,
                "subscriptionCostRate": float(row["subscription_cost_rate"]) if row["subscription_cost_rate"] is not None else None,
                "redemptionCostRate": float(row["redemption_cost_rate"]) if row["redemption_cost_rate"] is not None else None,
                "managementCostRate": float(row["management_cost_rate"]) if row["management_cost_rate"] is not None else None,
                "custodianCostRate": float(row["custodian_cost_rate"]) if row["custodian_cost_rate"] is not None else None,
                "salesServiceCostRate": float(row["sales_service_cost_rate"]) if row["sales_service_cost_rate"] is not None else None,
                "isRedemptionFeeFree": row["is_redemption_fee_free"],
            }
        )

    redemption_free_map = {row["fund_id"]: row["free_after_days"] for row in redemption_free_rows}
    mapped_theme_map: dict[str, set[str]] = {}
    for row in mapped_theme_rows:
        if row["theme_name"]:
            mapped_theme_map.setdefault(row["fund_id"], set()).add(row["theme_name"])

    candidate_statuses = list_candidate_statuses()
    items = []
    trade_date = None
    data_version = None
    updated_at = None
    for row in rows:
        candidate_status = candidate_statuses.get(row["fund_code"])
        fee_rule = fee_rule_map.get(row["fund_id"])
        if candidate_status and candidate_status["candidateStatus"] != "ready":
            data_source = _candidate_data_source(candidate_status["candidateStatus"])
        elif candidate_status and not fee_rule:
            data_source = "费用待补充"
        else:
            data_source = "真实快照"

        metric_quality = build_metric_quality(row, data_source)
        trade_date = trade_date or (row["trade_date"].isoformat() if row["trade_date"] else None)
        data_version = data_version or row["data_version"]
        updated_at = updated_at or (row["updated_at"].isoformat() if row["updated_at"] else None)
        items.append(
            {
                "fundId": row["fund_id"],
                "fundName": row["fund_name"],
                "fundCode": row["fund_code"],
                "fundType": row["fund_type"],
                "theme": row["theme"],
                "themeAliases": sorted({row["theme"], *mapped_theme_map.get(row["fund_id"], set())}),
                "trackingTarget": row["tracking_target"],
                "fundCompany": row["fund_company"],
                "tradableOnExchange": row["tradable_on_exchange"],
                "feeRate": float(row["fee_rate"]) if row["fee_rate"] is not None else None,
                "return1d": float(row["return_1d"]) if row["return_1d"] is not None else None,
                "return1m": float(row["return_1m"]) if row["return_1m"] is not None else None,
                "return3m": float(row["return_3m"]) if row["return_3m"] is not None else None,
                "return6m": float(row["return_6m"]) if row["return_6m"] is not None else None,
                "maxDrawdown": float(row["max_drawdown"]) if row["max_drawdown"] is not None else None,
                "volatility": float(row["volatility"]) if row["volatility"] is not None else None,
                "aum": normalize_aum_yi(row["aum"]),
                "latestNav": float(row["latest_nav"]) if row["latest_nav"] is not None else None,
                "previousNav": float(row["previous_nav"]) if row["previous_nav"] is not None else None,
                "latestNavDate": row["latest_nav_date"].isoformat() if row["latest_nav_date"] else None,
                "previousNavDate": row["previous_nav_date"].isoformat() if row["previous_nav_date"] else None,
                "metricTradeDate": row["trade_date"].isoformat() if row["trade_date"] else None,
                "metricUpdatedAt": row["updated_at"].isoformat() if row["updated_at"] else None,
                "metricDataVersion": row["data_version"],
                "foundedYears": row["founded_years"],
                "topHoldings": row["top_holdings_json"] or [],
                "concentrationLabel": row["concentration_label"],
                "trackingDeviationNote": row["tracking_deviation_note"],
                "feeRuleSummary": fee_rule,
                "holdingCostSummary": holding_cost_map.get(row["fund_id"], []),
                "redemptionFeeFreeAfterDays": redemption_free_map.get(row["fund_id"]),
                "dataSource": data_source,
                **metric_quality,
            }
        )

    existing_codes = {item["fundCode"] for item in items}
    for status in candidate_statuses.values():
        if status["fundCode"] in existing_codes:
            continue
        items.append(
            {
                "fundId": status["fundId"],
                "fundName": status["fundName"],
                "fundCode": status["fundCode"],
                "fundType": "公募基金",
                "theme": "自选基金",
                "themeAliases": ["自选基金"],
                "trackingTarget": status["fundName"],
                "fundCompany": "",
                "tradableOnExchange": status["fundCode"].startswith(("1", "5")),
                "feeRate": 0,
                "return1d": 0,
                "return1m": 0,
                "return3m": 0,
                "return6m": 0,
                "maxDrawdown": 0,
                "volatility": 0,
                "aum": 0,
                "latestNav": None,
                "previousNav": None,
                "latestNavDate": None,
                "previousNavDate": None,
                "metricTradeDate": None,
                "metricUpdatedAt": None,
                "metricDataVersion": None,
                "foundedYears": None,
                "topHoldings": [],
                "concentrationLabel": "待采集",
                "trackingDeviationNote": status["lastErrorMessage"] or "基金已加入真实采集池，等待触发 AKShare 数据采集。",
                "feeRuleSummary": None,
                "holdingCostSummary": [],
                "redemptionFeeFreeAfterDays": None,
                "dataSource": _candidate_data_source(status["candidateStatus"]),
                "dataCompleteness": "failed" if status["candidateStatus"] == "failed" else "pending",
                "missingMetrics": ["return1d", "return1m", "return3m", "return6m", "maxDrawdown", "volatility", "aum", "latestNav"],
            }
        )

    return {
        "tradeDate": trade_date,
        "dataVersion": data_version,
        "updatedAt": updated_at,
        "items": items,
    }


def _candidate_data_source(status: str | None) -> str:
    if status == "ready":
        return "真实快照"
    if status == "collecting":
        return "采集中"
    if status == "failed":
        return "采集失败"
    return "待采集"


def compare_funds_snapshot(fund_ids: list[str]) -> dict:
    if not fund_ids:
        return {"tradeDate": None, "dataVersion": None, "updatedAt": None, "items": []}

    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select
                    latest.fund_id,
                    fm.fund_name,
                    fm.fund_code,
                    latest.return_metrics_json,
                    latest.risk_metrics_json,
                    latest.fee_rate,
                    latest.aum,
                    latest.inception_date,
                    latest.top_holdings_json,
                    latest.concentration_label,
                    latest.tracking_deviation_note,
                    latest.trade_date,
                    latest.data_version,
                    latest.updated_at
                from (
                    select distinct on (fund_id) *
                    from fund_compare_daily
                    where fund_id = any(%s)
                    order by fund_id, trade_date desc, updated_at desc
                ) latest
                join fund_master fm on fm.fund_id = latest.fund_id
                order by fm.fund_code
                """,
                (fund_ids,),
            )
            rows = cur.fetchall()

            cur.execute(
                """
                select distinct on (fund_id, holding_days)
                    fund_id,
                    holding_days,
                    total_cost_rate,
                    subscription_cost_rate,
                    redemption_cost_rate,
                    management_cost_rate,
                    custodian_cost_rate,
                    sales_service_cost_rate,
                    is_redemption_fee_free,
                    matched_redemption_rule_json,
                    calculation_methodology_json
                from fund_holding_cost_snapshot
                where fund_id = any(%s)
                order by fund_id, holding_days, trade_date desc, updated_at desc
                """,
                (fund_ids,),
            )
            holding_cost_rows = cur.fetchall()

            cur.execute(
                """
                select distinct on (fund_id)
                    fund_id,
                    subscription_fee_rate,
                    purchase_fee_rate,
                    management_fee_rate,
                    custodian_fee_rate,
                    sales_service_fee_rate,
                    quality_status,
                    fee_rule_text
                from fund_fee_rule
                where fund_id = any(%s)
                order by fund_id, trade_date desc, updated_at desc
                """,
                (fund_ids,),
            )
            fee_rule_rows = cur.fetchall()

            cur.execute(
                """
                select ladder.fund_id, ladder.min_holding_days, ladder.max_holding_days, ladder.redemption_fee_rate,
                       ladder.rule_text, ladder.is_free_threshold, ladder.priority_rank
                from fund_redemption_fee_ladder ladder
                join (
                    select fund_id, max(trade_date) as trade_date
                    from fund_redemption_fee_ladder
                    where fund_id = any(%s)
                    group by fund_id
                ) latest
                    on latest.fund_id = ladder.fund_id
                   and latest.trade_date = ladder.trade_date
                order by ladder.fund_id, ladder.priority_rank asc, ladder.min_holding_days asc
                """,
                (fund_ids,),
            )
            redemption_rows = cur.fetchall()

    items = []
    trade_date = None
    data_version = None
    updated_at = None
    holding_cost_map: dict[str, list[dict]] = {}
    for row in holding_cost_rows:
        holding_cost_map.setdefault(row["fund_id"], []).append(
            {
                "holdingDays": row["holding_days"],
                "totalCostRate": float(row["total_cost_rate"]) if row["total_cost_rate"] is not None else None,
                "subscriptionCostRate": float(row["subscription_cost_rate"]) if row["subscription_cost_rate"] is not None else None,
                "redemptionCostRate": float(row["redemption_cost_rate"]) if row["redemption_cost_rate"] is not None else None,
                "managementCostRate": float(row["management_cost_rate"]) if row["management_cost_rate"] is not None else None,
                "custodianCostRate": float(row["custodian_cost_rate"]) if row["custodian_cost_rate"] is not None else None,
                "salesServiceCostRate": float(row["sales_service_cost_rate"]) if row["sales_service_cost_rate"] is not None else None,
                "isRedemptionFeeFree": row["is_redemption_fee_free"],
                "matchedRedemptionRule": row["matched_redemption_rule_json"],
                "methodology": row["calculation_methodology_json"],
            }
        )

    fee_rule_map = {
        row["fund_id"]: {
            "subscriptionFeeRate": float(row["subscription_fee_rate"]) if row["subscription_fee_rate"] is not None else None,
            "purchaseFeeRate": float(row["purchase_fee_rate"]) if row["purchase_fee_rate"] is not None else None,
            "managementFeeRate": float(row["management_fee_rate"]) if row["management_fee_rate"] is not None else None,
            "custodianFeeRate": float(row["custodian_fee_rate"]) if row["custodian_fee_rate"] is not None else None,
            "salesServiceFeeRate": float(row["sales_service_fee_rate"]) if row["sales_service_fee_rate"] is not None else None,
            "qualityStatus": row["quality_status"],
            "feeRuleText": row["fee_rule_text"],
        }
        for row in fee_rule_rows
    }
    redemption_rule_map: dict[str, list[dict]] = {}
    for row in redemption_rows:
        redemption_rule_map.setdefault(row["fund_id"], []).append(
            {
                "minHoldingDays": row["min_holding_days"],
                "maxHoldingDays": row["max_holding_days"],
                "redemptionFeeRate": float(row["redemption_fee_rate"]) if row["redemption_fee_rate"] is not None else None,
                "ruleText": row["rule_text"],
                "isFreeThreshold": row["is_free_threshold"],
                "priorityRank": row["priority_rank"],
            }
        )

    for row in rows:
        trade_date = trade_date or (row["trade_date"].isoformat() if row["trade_date"] else None)
        data_version = data_version or row["data_version"]
        updated_at = updated_at or (row["updated_at"].isoformat() if row["updated_at"] else None)
        items.append(
            {
                "fundId": row["fund_id"],
                "fundName": row["fund_name"],
                "fundCode": row["fund_code"],
                "returnMetrics": row["return_metrics_json"],
                "riskMetrics": row["risk_metrics_json"],
                "feeRate": float(row["fee_rate"]) if row["fee_rate"] is not None else None,
                "aum": normalize_aum_yi(row["aum"]),
                "inceptionDate": row["inception_date"].isoformat() if row["inception_date"] else None,
                "topHoldings": row["top_holdings_json"] or [],
                "concentration": row["concentration_label"],
                "trackingDeviationNote": row["tracking_deviation_note"],
                "feeRule": fee_rule_map.get(row["fund_id"]),
                "redemptionRules": redemption_rule_map.get(row["fund_id"], []),
                "holdingCostSummary": holding_cost_map.get(row["fund_id"], []),
            }
        )

    return {
        "tradeDate": trade_date,
        "dataVersion": data_version,
        "updatedAt": updated_at,
        "items": items,
    }
