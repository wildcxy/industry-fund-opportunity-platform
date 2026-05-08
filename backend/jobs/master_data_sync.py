import csv
import os
from pathlib import Path

from db.connection import get_connection
from jobs.shared import archive_dropzone_file, build_batch_id, log_job_end, log_job_start, resolve_trade_date


def load_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def sync_fund_master(cur, rows: list[dict[str, str]]) -> int:
    for row in rows:
        fee_rate = row.get("fee_rate") or None
        inception_date = row.get("inception_date") or None
        cur.execute(
            """
            insert into fund_master (
                fund_id, fund_code, fund_name, fund_type, theme, tracking_target,
                fund_company, tradable_on_exchange, fee_rate, inception_date, created_at, updated_at
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
            on conflict (fund_id) do update
            set fund_code = excluded.fund_code,
                fund_name = excluded.fund_name,
                fund_type = excluded.fund_type,
                theme = excluded.theme,
                tracking_target = excluded.tracking_target,
                fund_company = excluded.fund_company,
                tradable_on_exchange = excluded.tradable_on_exchange,
                fee_rate = excluded.fee_rate,
                inception_date = excluded.inception_date,
                updated_at = now()
            """,
            (
                row["fund_id"],
                row["fund_code"],
                row["fund_name"],
                row["fund_type"],
                row["theme"],
                row["tracking_target"],
                row["fund_company"],
                row["tradable_on_exchange"].lower() == "true",
                fee_rate,
                inception_date,
            ),
        )
    return len(rows)


def sync_industry_master(cur, rows: list[dict[str, str]]) -> int:
    for row in rows:
        display_name = row.get("display_name") or row["industry_name"]
        cur.execute(
            """
            insert into industry_master (industry_id, industry_name, display_name, created_at, updated_at)
            values (%s, %s, %s, now(), now())
            on conflict (industry_id) do update
            set industry_name = excluded.industry_name,
                display_name = excluded.display_name,
                updated_at = now()
            """,
            (row["industry_id"], row["industry_name"], display_name),
        )
    return len(rows)


def sync_industry_fund_mapping(cur, rows: list[dict[str, str]]) -> int:
    for row in rows:
        cur.execute(
            """
            insert into industry_fund_mapping (industry_id, fund_id, mapping_type, priority_rank, created_at, updated_at)
            values (%s, %s, %s, %s, now(), now())
            on conflict (industry_id, fund_id) do update
            set mapping_type = excluded.mapping_type,
                priority_rank = excluded.priority_rank,
                updated_at = now()
            """,
            (
                row["industry_id"],
                row["fund_id"],
                row.get("mapping_type") or "theme",
                row.get("priority_rank") or 0,
            ),
        )
    return len(rows)


def main() -> None:
    trade_date = resolve_trade_date(os.getenv("TRADE_DATE"))
    job_name = "master-data-sync"
    batch_id = build_batch_id(trade_date)
    log_job_start(job_name, batch_id, trade_date)

    processed_count = 0
    try:
        archived_files = {
            "fund-master": archive_dropzone_file("fund-master", batch_id, trade_date, "master/fund_master.csv")[0],
            "industry-master": archive_dropzone_file("industry-master", batch_id, trade_date, "master/industry_master.csv")[0],
            "industry-fund-mapping": archive_dropzone_file(
                "industry-fund-mapping", batch_id, trade_date, "master/industry_fund_mapping.csv"
            )[0],
        }

        if not any(archived_files.values()):
            print("No master data files found in manual drop zone.")
            log_job_end(job_name, batch_id, trade_date, run_status="skipped", processed_count=0)
            return

        with get_connection() as conn:
            with conn.cursor() as cur:
                if archived_files["fund-master"]:
                    processed_count += sync_fund_master(cur, load_csv_rows(archived_files["fund-master"]))
                if archived_files["industry-master"]:
                    processed_count += sync_industry_master(cur, load_csv_rows(archived_files["industry-master"]))
                if archived_files["industry-fund-mapping"]:
                    processed_count += sync_industry_fund_mapping(
                        cur, load_csv_rows(archived_files["industry-fund-mapping"])
                    )
            conn.commit()

        print(f"Master data synchronized. processed_count={processed_count}")
        log_job_end(job_name, batch_id, trade_date, processed_count=processed_count)
    except Exception as exc:
        log_job_end(job_name, batch_id, trade_date, run_status="failed", processed_count=processed_count, error_message=str(exc))
        raise


if __name__ == "__main__":
    main()
