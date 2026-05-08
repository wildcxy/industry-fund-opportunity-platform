import os
from collections import defaultdict

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from db.connection import get_connection
from jobs.shared import build_batch_id, log_job_end, log_job_start, resolve_trade_date


DATA_VERSION = "manual-drop-v1"
STANDARD_HOLDING_DAYS = [7, 30, 90, 180, 365, 730]


def to_float(value) -> float | None:
    if value is None:
        return None
    return float(value)


def prorate_annual_cost(rate: float | None, holding_days: int) -> float:
    if rate is None:
        return 0.0
    return round(rate * holding_days / 365, 4)


def match_redemption_rule(holding_days: int, ladders: list[dict]) -> dict | None:
    for ladder in ladders:
        min_days = ladder["min_holding_days"] or 0
        max_days = ladder["max_holding_days"]
        if holding_days < min_days:
            continue
        if max_days is not None and holding_days > max_days:
            continue
        return ladder
    return None


def build_methodology(holding_days: int, quality_status: str, matched_rule: dict | None) -> dict:
    return {
        "version": "long-hold-cost-v1",
        "holdingDays": holding_days,
        "annualFeeProration": "annual_rate * holding_days / 365",
        "qualityStatus": quality_status,
        "matchedRedemptionRule": {
            "minHoldingDays": matched_rule["min_holding_days"] if matched_rule else None,
            "maxHoldingDays": matched_rule["max_holding_days"] if matched_rule else None,
            "redemptionFeeRate": to_float(matched_rule["redemption_fee_rate"]) if matched_rule else None,
            "isFreeThreshold": matched_rule["is_free_threshold"] if matched_rule else None,
        },
        "disclaimer": "该结果用于基金之间的相对比较，不等同于用户真实到账成本，也不构成投资建议。",
    }


def main() -> None:
    trade_date = resolve_trade_date(os.getenv("TRADE_DATE"))
    job_name = "fund-holding-cost-snapshot-daily"
    batch_id = build_batch_id(trade_date)
    log_job_start(job_name, batch_id, trade_date)

    processed_count = 0
    try:
        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    select distinct on (fund_id) *
                    from fund_fee_rule
                    where trade_date <= %s and data_version = %s
                    order by fund_id, trade_date desc, updated_at desc
                    """,
                    (trade_date, DATA_VERSION),
                )
                fee_rows = cur.fetchall()

                cur.execute(
                    """
                    select ladder.*
                    from fund_redemption_fee_ladder ladder
                    join (
                        select fund_id, max(trade_date) as trade_date
                        from fund_redemption_fee_ladder
                        where trade_date <= %s and data_version = %s
                        group by fund_id
                    ) latest
                        on latest.fund_id = ladder.fund_id
                       and latest.trade_date = ladder.trade_date
                    where ladder.data_version = %s
                    order by ladder.fund_id, ladder.priority_rank asc, ladder.min_holding_days asc
                    """,
                    (trade_date, DATA_VERSION, DATA_VERSION),
                )
                ladder_rows = cur.fetchall()

                ladder_map: dict[str, list[dict]] = defaultdict(list)
                for row in ladder_rows:
                    ladder_map[row["fund_id"]].append(row)

                cur.execute(
                    "delete from fund_holding_cost_snapshot where trade_date = %s and data_version = %s",
                    (trade_date, DATA_VERSION),
                )

                for fee_row in fee_rows:
                    ladders = ladder_map.get(fee_row["fund_id"], [])
                    subscription_rate = to_float(fee_row["purchase_fee_rate"])
                    if subscription_rate is None:
                        subscription_rate = to_float(fee_row["subscription_fee_rate"]) or 0.0

                    management_rate = to_float(fee_row["management_fee_rate"])
                    custodian_rate = to_float(fee_row["custodian_fee_rate"])
                    sales_service_rate = to_float(fee_row["sales_service_fee_rate"])

                    for holding_days in STANDARD_HOLDING_DAYS:
                        matched_rule = match_redemption_rule(holding_days, ladders)
                        redemption_rate = to_float(matched_rule["redemption_fee_rate"]) if matched_rule else None
                        is_free = bool(matched_rule["is_free_threshold"]) if matched_rule else False
                        quality_status = fee_row["quality_status"] or "partial"
                        if matched_rule is None:
                            quality_status = "partial_missing_redemption_rule"

                        subscription_cost_rate = round(subscription_rate, 4)
                        redemption_cost_rate = 0.0 if is_free else round(redemption_rate or 0.0, 4)
                        management_cost_rate = prorate_annual_cost(management_rate, holding_days)
                        custodian_cost_rate = prorate_annual_cost(custodian_rate, holding_days)
                        sales_service_cost_rate = prorate_annual_cost(sales_service_rate, holding_days)
                        total_cost_rate = round(
                            subscription_cost_rate
                            + redemption_cost_rate
                            + management_cost_rate
                            + custodian_cost_rate
                            + sales_service_cost_rate,
                            4,
                        )

                        cur.execute(
                            """
                            insert into fund_holding_cost_snapshot (
                                trade_date, fund_id, holding_days, subscription_cost_rate, redemption_cost_rate,
                                management_cost_rate, custodian_cost_rate, sales_service_cost_rate,
                                total_cost_rate, is_redemption_fee_free, matched_redemption_rule_json,
                                calculation_methodology_json, source_batch_id, data_version, created_at, updated_at
                            )
                            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                            """,
                            (
                                trade_date,
                                fee_row["fund_id"],
                                holding_days,
                                subscription_cost_rate,
                                redemption_cost_rate,
                                management_cost_rate,
                                custodian_cost_rate,
                                sales_service_cost_rate,
                                total_cost_rate,
                                is_free,
                                Jsonb(
                                    {
                                        "minHoldingDays": matched_rule["min_holding_days"] if matched_rule else None,
                                        "maxHoldingDays": matched_rule["max_holding_days"] if matched_rule else None,
                                        "redemptionFeeRate": redemption_rate,
                                        "ruleText": matched_rule["rule_text"] if matched_rule else None,
                                        "qualityStatus": quality_status,
                                    }
                                ),
                                Jsonb(build_methodology(holding_days, quality_status, matched_rule)),
                                batch_id,
                                DATA_VERSION,
                            ),
                        )
                        processed_count += 1
            conn.commit()

        status = "success" if processed_count > 0 else "skipped"
        print(f"Holding cost snapshots built rows={processed_count}")
        log_job_end(job_name, batch_id, trade_date, run_status=status, processed_count=processed_count)
    except Exception as exc:
        log_job_end(job_name, batch_id, trade_date, run_status="failed", processed_count=processed_count, error_message=str(exc))
        raise


if __name__ == "__main__":
    main()
