import csv
import os
from pathlib import Path

from db.connection import get_connection
from jobs.shared import archive_dropzone_file, build_batch_id, log_job_end, log_job_start, resolve_trade_date


DEFAULT_DATA_VERSION = "manual-drop-v1"


def load_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def parse_int(value: str | None) -> int | None:
    if value in (None, ""):
        return None
    return int(value)


def parse_bool(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"true", "1", "yes", "y"}


def load_fee_rules(cur, trade_date, batch_id: str, rows: list[dict[str, str]]) -> int:
    cur.execute("delete from fund_fee_rule where trade_date = %s and data_version = %s", (trade_date, DEFAULT_DATA_VERSION))
    count = 0
    for row in rows:
        cur.execute(
            """
            insert into fund_fee_rule (
                fund_id, trade_date, subscription_fee_rate, purchase_fee_rate, management_fee_rate,
                custodian_fee_rate, sales_service_fee_rate, fee_rule_text, source_name, source_batch_id,
                data_version, quality_status, created_at, updated_at
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
            """,
            (
                row["fund_id"],
                row.get("trade_date") or trade_date,
                row.get("subscription_fee_rate") or None,
                row.get("purchase_fee_rate") or None,
                row.get("management_fee_rate") or None,
                row.get("custodian_fee_rate") or None,
                row.get("sales_service_fee_rate") or None,
                row.get("fee_rule_text") or None,
                row.get("source_name") or "manual-drop",
                row.get("source_batch_id") or batch_id,
                row.get("data_version") or DEFAULT_DATA_VERSION,
                row.get("quality_status") or "partial",
            ),
        )
        count += 1
    return count


def load_redemption_ladders(cur, trade_date, batch_id: str, rows: list[dict[str, str]]) -> int:
    cur.execute(
        "delete from fund_redemption_fee_ladder where trade_date = %s and data_version = %s",
        (trade_date, DEFAULT_DATA_VERSION),
    )
    count = 0
    for row in rows:
        cur.execute(
            """
            insert into fund_redemption_fee_ladder (
                fund_id, trade_date, min_holding_days, max_holding_days, redemption_fee_rate,
                rule_text, is_free_threshold, priority_rank, source_name, source_batch_id,
                data_version, quality_status, created_at, updated_at
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
            """,
            (
                row["fund_id"],
                row.get("trade_date") or trade_date,
                parse_int(row.get("min_holding_days")) or 0,
                parse_int(row.get("max_holding_days")),
                row.get("redemption_fee_rate") or None,
                row.get("rule_text") or None,
                parse_bool(row.get("is_free_threshold")),
                parse_int(row.get("priority_rank")) or 0,
                row.get("source_name") or "manual-drop",
                row.get("source_batch_id") or batch_id,
                row.get("data_version") or DEFAULT_DATA_VERSION,
                row.get("quality_status") or "partial",
            ),
        )
        count += 1
    return count


def main() -> None:
    trade_date = resolve_trade_date(os.getenv("TRADE_DATE"))
    job_name = "fund-fee-rule-ingestion"
    batch_id = build_batch_id(trade_date)
    log_job_start(job_name, batch_id, trade_date)

    processed_count = 0
    try:
        archived_files = {
            "fund-fee-rule": archive_dropzone_file("fund-fee-rule", batch_id, trade_date, "master/fund_fee_rule.csv")[0],
            "fund-redemption-fee-ladder": archive_dropzone_file(
                "fund-redemption-fee-ladder", batch_id, trade_date, "master/fund_redemption_fee_ladder.csv"
            )[0],
        }

        if not any(archived_files.values()):
            print("No fee rule files found in manual drop zone.")
            log_job_end(job_name, batch_id, trade_date, run_status="skipped", processed_count=0)
            return

        with get_connection() as conn:
            with conn.cursor() as cur:
                if archived_files["fund-fee-rule"]:
                    processed_count += load_fee_rules(cur, trade_date, batch_id, load_csv_rows(archived_files["fund-fee-rule"]))
                if archived_files["fund-redemption-fee-ladder"]:
                    processed_count += load_redemption_ladders(
                        cur, trade_date, batch_id, load_csv_rows(archived_files["fund-redemption-fee-ladder"])
                    )
            conn.commit()

        status = "success" if processed_count > 0 else "skipped"
        print(f"Fund fee rules ingested. processed_count={processed_count}")
        log_job_end(job_name, batch_id, trade_date, run_status=status, processed_count=processed_count)
    except Exception as exc:
        log_job_end(job_name, batch_id, trade_date, run_status="failed", processed_count=processed_count, error_message=str(exc))
        raise


if __name__ == "__main__":
    main()
