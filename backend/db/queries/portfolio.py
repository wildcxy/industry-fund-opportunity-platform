from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from psycopg.rows import dict_row

from db.connection import get_connection

DEFAULT_USER_ID = "local-demo"


def _number(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def normalize_fund_code(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = str(value).strip()
    return cleaned.zfill(6) if cleaned else None


def upsert_portfolio_positions(items: list[dict], user_id: str = DEFAULT_USER_ID) -> list[dict]:
    saved: list[dict] = []
    incoming_position_ids = [
        str(item.get("positionId") or item.get("position_id") or "").strip()
        for item in items
        if str(item.get("positionId") or item.get("position_id") or "").strip()
    ]
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            if incoming_position_ids:
                cur.execute(
                    """
                    delete from portfolio_position_snapshot
                    where user_id = %s
                      and not (position_id = any(%s))
                    """,
                    (user_id, incoming_position_ids),
                )
            else:
                cur.execute(
                    """
                    delete from portfolio_position_snapshot
                    where user_id = %s
                    """,
                    (user_id,),
                )
            for item in items:
                position_id = str(item.get("positionId") or item.get("position_id") or "").strip()
                fund_name = str(item.get("fundName") or item.get("fund_name") or "").strip()
                if not position_id or not fund_name:
                    continue

                fund_code = normalize_fund_code(item.get("fundCode") or item.get("fund_code"))
                snapshot_id = f"{user_id}-{position_id}"
                if fund_code:
                    cur.execute(
                        """
                        delete from portfolio_position_snapshot
                        where user_id = %s
                          and fund_code = %s
                          and position_id <> %s
                        """,
                        (user_id, fund_code, position_id),
                    )
                cur.execute(
                    """
                    insert into portfolio_position_snapshot (
                        snapshot_id, user_id, position_id, fund_code, fund_name, source,
                        market_value_snapshot, day_profit_snapshot, holding_profit_snapshot,
                        holding_return_snapshot, units, cost_nav, data_status, data_date,
                        created_at, updated_at
                    )
                    values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                    on conflict (user_id, position_id) do update
                    set fund_code = excluded.fund_code,
                        fund_name = excluded.fund_name,
                        source = excluded.source,
                        market_value_snapshot = excluded.market_value_snapshot,
                        day_profit_snapshot = excluded.day_profit_snapshot,
                        holding_profit_snapshot = excluded.holding_profit_snapshot,
                        holding_return_snapshot = excluded.holding_return_snapshot,
                        units = excluded.units,
                        cost_nav = excluded.cost_nav,
                        data_status = excluded.data_status,
                        data_date = excluded.data_date,
                        updated_at = now()
                    returning *
                    """,
                    (
                        snapshot_id,
                        user_id,
                        position_id,
                        fund_code,
                        fund_name,
                        item.get("source") or "manual_snapshot",
                        item.get("marketValueSnapshot") or item.get("market_value_snapshot"),
                        item.get("dayProfitSnapshot") or item.get("day_profit_snapshot"),
                        item.get("holdingProfitSnapshot") or item.get("holding_profit_snapshot"),
                        item.get("holdingReturnSnapshot") or item.get("holding_return_snapshot"),
                        item.get("units"),
                        item.get("costNav") or item.get("cost_nav"),
                        "matched" if fund_code else "snapshot",
                        item.get("dataDate") or item.get("data_date"),
                    ),
                )
                saved.append(_serialize_position(cur.fetchone()))
            for table_name in (
                "portfolio_candidate_fund",
                "portfolio_decision_tip",
                "portfolio_diagnosis_snapshot",
                "portfolio_position_valuation",
                "portfolio_valuation_snapshot",
            ):
                cur.execute(f"delete from {table_name} where user_id = %s", (user_id,))
        conn.commit()
    return saved


def list_portfolio_positions(user_id: str = DEFAULT_USER_ID) -> list[dict]:
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select *
                from portfolio_position_snapshot
                where user_id = %s
                order by updated_at desc, id desc
                """,
                (user_id,),
            )
            rows = cur.fetchall()
    return [_serialize_position(row) for row in rows]


def get_latest_decision_view(user_id: str = DEFAULT_USER_ID) -> dict:
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select *
                from portfolio_valuation_snapshot
                where user_id = %s
                order by trade_date desc, updated_at desc
                limit 1
                """,
                (user_id,),
            )
            valuation = cur.fetchone()

            trade_date = valuation["trade_date"] if valuation else None
            position_rows = []
            diagnosis = None
            tips = []
            candidates = []
            if trade_date:
                cur.execute(
                    """
                    select *
                    from portfolio_position_valuation
                    where user_id = %s and trade_date = %s
                    order by market_value desc nulls last
                    """,
                    (user_id, trade_date),
                )
                position_rows = cur.fetchall()

                cur.execute(
                    """
                    select diagnosis_json
                    from portfolio_diagnosis_snapshot
                    where user_id = %s and trade_date = %s
                    """,
                    (user_id, trade_date),
                )
                diagnosis_row = cur.fetchone()
                diagnosis = diagnosis_row["diagnosis_json"] if diagnosis_row else None

                cur.execute(
                    """
                    select *
                    from portfolio_decision_tip
                    where user_id = %s and trade_date = %s
                    order by case severity when 'high' then 1 when 'medium' then 2 else 3 end, created_at
                    """,
                    (user_id, trade_date),
                )
                tips = cur.fetchall()

                cur.execute(
                    """
                    select *
                    from portfolio_candidate_fund
                    where user_id = %s and trade_date = %s
                    order by created_at
                    limit 12
                    """,
                    (user_id, trade_date),
                )
                candidates = cur.fetchall()

    return {
        "valuation": _serialize_valuation(valuation) if valuation else None,
        "positions": [_serialize_position_valuation(row) for row in position_rows],
        "diagnosis": diagnosis,
        "tips": [_serialize_tip(row) for row in tips],
        "candidates": [_serialize_candidate(row) for row in candidates],
        "disclaimer": "本模块仅用于个人持仓复盘、候选观察和风险提示，不构成买入、卖出或收益承诺。QDII 与部分基金净值可能存在披露延迟。",
    }


def _serialize_position(row: dict) -> dict:
    return {
        "positionId": row["position_id"],
        "fundCode": row["fund_code"],
        "fundName": row["fund_name"],
        "source": row["source"],
        "marketValueSnapshot": _number(row["market_value_snapshot"]),
        "dayProfitSnapshot": _number(row["day_profit_snapshot"]),
        "holdingProfitSnapshot": _number(row["holding_profit_snapshot"]),
        "holdingReturnSnapshot": _number(row["holding_return_snapshot"]),
        "units": _number(row["units"]),
        "costNav": _number(row["cost_nav"]),
        "dataStatus": row["data_status"],
        "dataDate": row["data_date"].isoformat() if row["data_date"] else None,
        "createdAt": row["created_at"].isoformat() if row["created_at"] else None,
        "updatedAt": row["updated_at"].isoformat() if row["updated_at"] else None,
    }


def _serialize_valuation(row: dict) -> dict:
    return {
        "valuationId": row["valuation_id"],
        "tradeDate": row["trade_date"].isoformat() if isinstance(row["trade_date"], date) else row["trade_date"],
        "totalMarketValue": _number(row["total_market_value"]),
        "totalCostValue": _number(row["total_cost_value"]),
        "totalDayProfit": _number(row["total_day_profit"]),
        "totalHoldingProfit": _number(row["total_holding_profit"]),
        "holdingCount": row["holding_count"],
        "enhancedCount": row["enhanced_count"],
        "summary": row["summary_json"],
        "quality": row["quality_json"],
        "updatedAt": row["updated_at"].isoformat() if row["updated_at"] else None,
    }


def _serialize_position_valuation(row: dict) -> dict:
    return {
        "positionId": row["position_id"],
        "fundCode": row["fund_code"],
        "fundName": row["fund_name"],
        "theme": row["theme"],
        "fundType": row["fund_type"],
        "latestNav": _number(row["latest_nav"]),
        "previousNav": _number(row["previous_nav"]),
        "return1d": _number(row["return_1d"]),
        "marketValue": _number(row["market_value"]),
        "costValue": _number(row["cost_value"]),
        "dayProfit": _number(row["day_profit"]),
        "holdingProfit": _number(row["holding_profit"]),
        "holdingReturn": _number(row["holding_return"]),
        "dataMode": row["data_mode"],
        "dataQuality": row["data_quality"],
    }


def _serialize_tip(row: dict) -> dict:
    return {
        "tipId": row["tip_id"],
        "tipType": row["tip_type"],
        "severity": row["severity"],
        "title": row["title"],
        "summary": row["summary"],
        "evidence": row["evidence_json"],
        "dataQuality": row["data_quality"],
        "riskDisclaimer": row["risk_disclaimer"],
    }


def _serialize_candidate(row: dict) -> dict:
    return {
        "candidateId": row["candidate_id"],
        "fundId": row["fund_id"],
        "fundCode": row["fund_code"],
        "fundName": row["fund_name"],
        "sourceType": row["source_type"],
        "reason": row["reason"],
        "metrics": row["metrics_json"],
        "dataQuality": row["data_quality"],
        "riskDisclaimer": row["risk_disclaimer"],
    }
