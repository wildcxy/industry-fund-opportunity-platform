import csv
import os
from pathlib import Path

from psycopg.types.json import Jsonb

from db.connection import get_connection
from jobs.shared import (
    build_batch_id,
    get_trade_archive_raw_dir,
    log_job_end,
    log_job_start,
    resolve_trade_date,
)


DATA_VERSION = "manual-drop-v1"


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def split_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [item.strip() for item in raw.split("|") if item.strip()]


def load_fund_daily_metrics(cur, trade_date, batch_id: str, rows: list[dict[str, str]]) -> int:
    cur.execute("delete from fund_daily_metrics where trade_date = %s and data_version = %s", (trade_date, DATA_VERSION))
    count = 0
    for row in rows:
        cur.execute(
            """
            insert into fund_daily_metrics (
                trade_date, fund_id, return_1d, return_1m, return_3m, return_6m, max_drawdown, volatility, aum,
                latest_nav, previous_nav, latest_nav_date, previous_nav_date, founded_years, top_holdings_json, concentration_label, tracking_deviation_note,
                source_batch_id, data_version, created_at, updated_at
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
            """,
            (
                trade_date,
                row["fund_id"],
                row.get("return_1d") or None,
                row.get("return_1m") or None,
                row.get("return_3m") or None,
                row.get("return_6m") or None,
                row.get("max_drawdown") or None,
                row.get("volatility") or None,
                row.get("aum") or None,
                row.get("latest_nav") or None,
                row.get("previous_nav") or None,
                row.get("latest_nav_date") or None,
                row.get("previous_nav_date") or None,
                row.get("founded_years") or None,
                Jsonb(split_list(row.get("top_holdings"))),
                row.get("concentration_label") or None,
                row.get("tracking_deviation_note") or None,
                batch_id,
                DATA_VERSION,
            ),
        )
        count += 1
    return count


def load_industry_daily_metrics(cur, trade_date, batch_id: str, rows: list[dict[str, str]]) -> int:
    cur.execute(
        "delete from industry_daily_metrics where trade_date = %s and data_version = %s",
        (trade_date, DATA_VERSION),
    )
    count = 0
    for row in rows:
        cur.execute(
            """
            insert into industry_daily_metrics (
                trade_date, industry_id, performance_5d, performance_20d, performance_60d,
                trend_score, capital_score, valuation_score, risk_score, risk_level, fund_count,
                source_batch_id, data_version, created_at, updated_at
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
            """,
            (
                trade_date,
                row["industry_id"],
                row.get("performance_5d") or None,
                row.get("performance_20d") or None,
                row.get("performance_60d") or None,
                row.get("trend_score") or None,
                row.get("capital_score") or None,
                row.get("valuation_score") or None,
                row.get("risk_score") or None,
                row.get("risk_level") or None,
                row.get("fund_count") or None,
                batch_id,
                DATA_VERSION,
            ),
        )
        count += 1
    return count


def load_industry_events(cur, trade_date, batch_id: str, rows: list[dict[str, str]]) -> int:
    cur.execute(
        "delete from industry_events_daily where trade_date = %s and data_version = %s",
        (trade_date, DATA_VERSION),
    )
    count = 0
    for index, row in enumerate(rows, start=1):
        cur.execute(
            """
            insert into industry_events_daily (
                trade_date, industry_id, event_date, event_title, event_summary, event_type, priority_rank,
                source_batch_id, data_version, created_at, updated_at
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
            """,
            (
                trade_date,
                row["industry_id"],
                row["event_date"],
                row["event_title"],
                row["event_summary"],
                row.get("event_type") or "event",
                row.get("priority_rank") or index,
                batch_id,
                DATA_VERSION,
            ),
        )
        count += 1
    return count


def main() -> None:
    trade_date = resolve_trade_date(os.getenv("TRADE_DATE"))
    job_name = "standardize-and-load"
    batch_id = build_batch_id(trade_date)
    log_job_start(job_name, batch_id, trade_date)

    raw_dir = get_trade_archive_raw_dir(trade_date)
    fund_path = raw_dir / "daily" / "fund_daily_metrics.csv"
    industry_path = raw_dir / "daily" / "industry_daily_metrics.csv"
    events_path = raw_dir / "daily" / "industry_events.csv"

    processed_count = 0
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                if fund_path.exists():
                    processed_count += load_fund_daily_metrics(cur, trade_date, batch_id, read_csv_rows(fund_path))
                if industry_path.exists():
                    processed_count += load_industry_daily_metrics(cur, trade_date, batch_id, read_csv_rows(industry_path))
                if events_path.exists():
                    processed_count += load_industry_events(cur, trade_date, batch_id, read_csv_rows(events_path))
            conn.commit()

        status = "success" if processed_count > 0 else "skipped"
        print(f"Standardized and loaded rows={processed_count} from {raw_dir}")
        log_job_end(job_name, batch_id, trade_date, run_status=status, processed_count=processed_count)
    except Exception as exc:
        log_job_end(job_name, batch_id, trade_date, run_status="failed", processed_count=processed_count, error_message=str(exc))
        raise


if __name__ == "__main__":
    main()
