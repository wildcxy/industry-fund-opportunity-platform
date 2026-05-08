import os

from db.connection import get_connection
from jobs.shared import build_batch_id, log_job_end, log_job_start, resolve_trade_date


DATA_VERSION = "manual-drop-v1"


def main() -> None:
    trade_date = resolve_trade_date(os.getenv("TRADE_DATE"))
    job_name = "snapshot-publish"
    batch_id = build_batch_id(trade_date)
    log_job_start(job_name, batch_id, trade_date)

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    insert into data_publish_batch (
                        batch_id, trade_date, pipeline_stage, publish_status, published_at, message, created_at, updated_at
                    )
                    values (%s, %s, 'snapshot-publish', 'published', now(), %s, now(), now())
                    """,
                    (batch_id, trade_date, f"Manual-drop snapshots published for {DATA_VERSION}."),
                )
            conn.commit()

        print(f"Published snapshot batch={batch_id}")
        log_job_end(job_name, batch_id, trade_date, processed_count=1)
    except Exception as exc:
        log_job_end(job_name, batch_id, trade_date, run_status="failed", error_message=str(exc))
        raise


if __name__ == "__main__":
    main()
