from psycopg.rows import dict_row

from db.connection import get_connection
from db.queries.fund_candidates import get_candidate_by_code


def get_fund_holding_view(fund_code: str) -> dict:
    normalized = str(fund_code or "").strip().zfill(6)
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select fund_id, fund_code, fund_name, fund_type, theme, tracking_target
                from fund_master
                where fund_code = %s
                """,
                (normalized,),
            )
            fund = cur.fetchone()
            if not fund:
                candidate = get_candidate_by_code(normalized)
                if not candidate:
                    return {"fundCode": normalized, "status": "not_found", "holdings": [], "rebalanceInference": []}
                return {
                    "status": candidate["request_status"],
                    "fund": {
                        "fundId": candidate["fund_id"],
                        "fundCode": candidate["fund_code"],
                        "fundName": candidate["matched_fund_name"],
                        "fundType": candidate["matched_fund_type"],
                        "theme": candidate["theme"],
                        "trackingTarget": candidate["tracking_target"],
                    },
                    "sourceQuality": "awaiting_disclosure",
                    "holdingFreshness": _build_freshness([]),
                    "holdings": [],
                    "rebalanceInference": _infer_rebalance(None, None, []),
                    "disclaimer": "该基金已加入候选池，但尚未完成真实快照采集；需要先完成净值与主数据采集后，才可展示持仓披露和调仓方向推测。",
                }

            cur.execute(
                """
                select report_period, report_date, disclose_date, holding_name, holding_code,
                       holding_type, weight_percent, source_name, data_quality
                from fund_disclosed_holding
                where fund_code = %s
                order by report_period desc, weight_percent desc nulls last
                limit 20
                """,
                (normalized,),
            )
            disclosed_rows = cur.fetchall()

            cur.execute(
                """
                select distinct on (fund_id)
                    return_1d, return_1m, return_3m, return_6m, max_drawdown, volatility,
                    top_holdings_json, concentration_label, tracking_deviation_note, trade_date
                from fund_daily_metrics
                where fund_id = %s
                order by fund_id, trade_date desc, updated_at desc
                """,
                (fund["fund_id"],),
            )
            metrics = cur.fetchone()

    top_holdings = metrics["top_holdings_json"] if metrics and metrics["top_holdings_json"] else []
    holdings = [_serialize_disclosed(row) for row in disclosed_rows]
    source_quality = "official_disclosure" if holdings else "awaiting_disclosure"
    if not holdings and top_holdings:
        holdings = [
            {
                "holdingName": name,
                "holdingCode": None,
                "holdingType": "stock",
                "weightPercent": None,
                "reportPeriod": "历史样例/待核验",
                "reportDate": None,
                "discloseDate": None,
                "sourceName": "snapshot-top-holdings",
                "dataQuality": "name_only",
            }
            for name in top_holdings
        ]
        source_quality = "name_only"

    return {
        "status": "ok",
        "fund": {
            "fundId": fund["fund_id"],
            "fundCode": fund["fund_code"],
            "fundName": fund["fund_name"],
            "fundType": fund["fund_type"],
            "theme": fund["theme"],
            "trackingTarget": fund["tracking_target"],
        },
        "sourceQuality": source_quality,
        "holdingFreshness": _build_freshness(holdings),
        "holdings": holdings,
        "rebalanceInference": _infer_rebalance(fund, metrics, holdings),
        "disclaimer": "官方披露持仓存在滞后；调仓方向为基于净值表现、主题与披露持仓的推测，不代表实时持仓或投资建议。",
    }


def _serialize_disclosed(row: dict) -> dict:
    return {
        "holdingName": row["holding_name"],
        "holdingCode": row["holding_code"],
        "holdingType": row["holding_type"],
        "weightPercent": float(row["weight_percent"]) if row["weight_percent"] is not None else None,
        "reportPeriod": row["report_period"],
        "reportDate": row["report_date"].isoformat() if row["report_date"] else None,
        "discloseDate": row["disclose_date"].isoformat() if row["disclose_date"] else None,
        "sourceName": row["source_name"],
        "dataQuality": row["data_quality"],
    }


def _build_freshness(holdings: list[dict]) -> dict:
    if not holdings:
        return {
            "label": "官方持仓待接入",
            "summary": "当前尚未接入该基金的定期报告持仓明细。",
            "stalenessDays": None,
        }
    period = holdings[0]["reportPeriod"]
    return {
        "label": f"{period} 披露持仓",
        "summary": "该持仓来自已披露报告，可能滞后于基金经理当前真实组合。",
        "stalenessDays": None,
    }


def _float_or_none(value) -> float | None:
    if value is None:
        return None
    return float(value)


def _infer_rebalance(fund: dict | None, metrics: dict | None, holdings: list[dict]) -> list[dict]:
    if not metrics:
        return [
            {
                "direction": "insufficient_data",
                "label": "推测数据不足",
                "confidence": 20,
                "evidence": "缺少净值表现与波动指标，暂不推测调仓方向。",
            }
        ]

    theme = fund["theme"] or fund["tracking_target"]
    return_1m = _float_or_none(metrics["return_1m"])
    return_3m = _float_or_none(metrics["return_3m"])
    drawdown = _float_or_none(metrics["max_drawdown"])
    holding_names = "、".join(item["holdingName"] for item in holdings[:5]) or "官方持仓待补充"

    if return_1m is None or return_3m is None or drawdown is None:
        return [
            {
                "direction": "insufficient_data",
                "label": "推测数据不足",
                "confidence": 25,
                "evidence": "近 1 月、近 3 月或最大回撤指标缺失，系统不会把缺失值当作 0 来推测调仓方向。",
            }
        ]

    if return_1m >= 5 and return_3m >= 10:
        return [
            {
                "direction": "possible_add",
                "label": f"疑似维持或增配 {theme}",
                "confidence": 62,
                "evidence": f"近 1 月与近 3 月表现较强，披露/样例持仓包含 {holding_names}。",
            }
        ]

    if drawdown <= -20 or return_3m <= -10:
        return [
            {
                "direction": "possible_reduce_or_pressure",
                "label": f"{theme} 暴露承压",
                "confidence": 55,
                "evidence": "近阶段回撤或 3 月表现偏弱，可能是主题下行或组合减仓后的滞后表现，需要结合下一期披露验证。",
            }
        ]

    return [
        {
            "direction": "stable_or_unclear",
            "label": "调仓方向不明显",
            "confidence": 45,
            "evidence": "当前净值表现没有给出强方向信号，适合等待后续净值与披露持仓交叉验证。",
        }
    ]
