import os

from jobs.shared import archive_dropzone_file, build_batch_id, log_job_end, log_job_start, resolve_trade_date


def main() -> None:
    trade_date = resolve_trade_date(os.getenv("TRADE_DATE"))
    job_name = "industry-metrics-ingestion"
    batch_id = build_batch_id(trade_date)
    log_job_start(job_name, batch_id, trade_date)

    try:
        archived_path, row_count = archive_dropzone_file(
            "industry-daily-metrics", batch_id, trade_date, "daily/industry_daily_metrics.csv"
        )
        status = "success" if archived_path else "skipped"
        print(f"Industry metrics archived: path={archived_path} row_count={row_count}")
        log_job_end(job_name, batch_id, trade_date, run_status=status, processed_count=row_count)
    except Exception as exc:
        log_job_end(job_name, batch_id, trade_date, run_status="failed", error_message=str(exc))
        raise


if __name__ == "__main__":
    main()
