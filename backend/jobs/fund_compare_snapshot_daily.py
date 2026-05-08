import os

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from db.connection import get_connection
from jobs.shared import build_batch_id, log_job_end, log_job_start, resolve_trade_date


DATA_VERSION = "manual-drop-v1"


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
                                    "day1": float(row["return_1d"] or 0),
                                    "month1": float(row["return_1m"] or 0),
                                    "month3": float(row["return_3m"] or 0),
                                    "month6": float(row["return_6m"] or 0),
                                    "latestNav": float(row["latest_nav"] or 0),
                                    "previousNav": float(row["previous_nav"] or 0),
                                }
                            ),
                            Jsonb(
                                {
                                    "maxDrawdown": float(row["max_drawdown"] or 0),
                                    "volatility": float(row["volatility"] or 0),
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
