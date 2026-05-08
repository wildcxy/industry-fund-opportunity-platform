import os

from config.settings import get_settings
from jobs.shared import build_batch_id, log_job_end, log_job_start, resolve_trade_date, write_dropzone_csv
from providers import AKShareFundProvider, load_fund_universe


FIELDNAMES = [
    "fund_id",
    "return_1d",
    "return_1m",
    "return_3m",
    "return_6m",
    "max_drawdown",
    "volatility",
    "aum",
    "latest_nav",
    "previous_nav",
    "latest_nav_date",
    "previous_nav_date",
    "founded_years",
    "top_holdings",
    "concentration_label",
    "tracking_deviation_note",
]


def build_failed_row(fund_id: str, message: str) -> dict[str, object]:
    return {
        "fund_id": fund_id,
        "return_1d": None,
        "return_1m": None,
        "return_3m": None,
        "return_6m": None,
        "max_drawdown": None,
        "volatility": None,
        "aum": None,
        "latest_nav": None,
        "previous_nav": None,
        "latest_nav_date": None,
        "previous_nav_date": None,
        "founded_years": None,
        "top_holdings": "",
        "concentration_label": "待补充",
        "tracking_deviation_note": f"AKShare 日度抓取失败，当前保留空值占位：{message}",
    }


def main() -> None:
    settings = get_settings()
    if not settings.akshare_enable:
        raise RuntimeError("AKSHARE_ENABLE=false. Enable AKShare collection before running this job.")

    trade_date = resolve_trade_date(os.getenv("TRADE_DATE"))
    job_name = "akshare-fund-daily-fetch"
    batch_id = build_batch_id(trade_date)
    log_job_start(job_name, batch_id, trade_date)

    processed_count = 0
    try:
        provider = AKShareFundProvider()
        universe = load_fund_universe(settings.akshare_fund_universe_path)
        chunks = provider.chunked(universe)
        total_chunks = len(chunks)
        rows: list[dict[str, object]] = []

        for chunk_index, chunk in enumerate(chunks, start=1):
            print(f"[AKShare daily] chunk={chunk_index}/{total_chunks} size={len(chunk)}")
            for item in chunk:
                try:
                    rows.append(provider.build_daily_metrics_row(item, trade_date).to_csv_row())
                except Exception as exc:
                    print(f"[AKShare daily skip] fund_id={item.fund_id} code={item.fund_code} error={exc}")
                    rows.append(build_failed_row(item.fund_id, str(exc)))
                processed_count += 1
            if chunk_index < total_chunks:
                provider.cool_down_between_chunks()

        destination = write_dropzone_csv(trade_date, "daily/fund_daily_metrics.csv", FIELDNAMES, rows)
        print(f"AKShare fund metrics written: path={destination} row_count={processed_count}")
        log_job_end(job_name, batch_id, trade_date, processed_count=processed_count)
    except Exception as exc:
        log_job_end(job_name, batch_id, trade_date, run_status="failed", processed_count=processed_count, error_message=str(exc))
        raise


if __name__ == "__main__":
    main()
