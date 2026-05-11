import os

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from db.connection import get_connection
from jobs.shared import build_batch_id, log_job_end, log_job_start, resolve_trade_date


DATA_VERSION = "manual-drop-v1"


def float_or_none(value) -> float | None:
    if value is None:
        return None
    return float(value)


def main() -> None:
    trade_date = resolve_trade_date(os.getenv("TRADE_DATE"))
    job_name = "fund-compare-snapshot-daily"
    batch_id = build_batch_id(trade_date)
    log_job_start(job_name, batch_id, trade_date)

    processed_count = 0
    try:
        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    select fm.*, fdm.*
                    from fund_master fm
                    join fund_daily_metrics fdm on fdm.fund_id = fm.fund_id
                    where fdm.trade_date = %s and fdm.data_version = %s
                    """,
                    (trade_date, DATA_VERSION),
                )
                rows = cur.fetchall()

                cur.execute("delete from fund_compare_daily where trade_date = %s and data_version = %s", (trade_date, DATA_VERSION))

                for row in rows:
                    cur.execute(
                        """
                        insert into fund_compare_daily (
                            trade_date, fund_id, return_metrics_json, risk_metrics_json, fee_rate, aum, inception_date,
                            top_holdings_json, concentration_label, tracking_deviation_note, source_batch_id, data_version,
                            created_at, updated_at
                        )
                        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                        """,
                        (
                            trade_date,
                            row["fund_id"],
                            Jsonb(
                                {
                                    "day1": float_or_none(row["return_1d"]),
                                    "month1": float_or_none(row["return_1m"]),
                                    "month3": float_or_none(row["return_3m"]),
                                    "month6": float_or_none(row["return_6m"]),
                                    "latestNav": float_or_none(row["latest_nav"]),
                                    "previousNav": float_or_none(row["previous_nav"]),
                                }
                            ),
                            Jsonb(
                                {
                                    "maxDrawdown": float_or_none(row["max_drawdown"]),
                                    "volatility": float_or_none(row["volatility"]),
                                }
                            ),
                            row["fee_rate"],
                            row["aum"],
                            row["inception_date"],
                            Jsonb(row["top_holdings_json"] or []),
                            row["concentration_label"],
                            row["tracking_deviation_note"],
                            batch_id,
                            DATA_VERSION,
                        ),
                    )
                    processed_count += 1
            conn.commit()

        status = "success" if processed_count > 0 else "skipped"
        print(f"Fund compare snapshots built rows={processed_count}")
        log_job_end(job_name, batch_id, trade_date, run_status=status, processed_count=processed_count)
    except Exception as exc:
        log_job_end(job_name, batch_id, trade_date, run_status="failed", processed_count=processed_count, error_message=str(exc))
        raise


if __name__ == "__main__":
    main()
