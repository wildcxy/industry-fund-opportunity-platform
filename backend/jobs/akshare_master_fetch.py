import os

from config.settings import get_settings
from jobs.shared import build_batch_id, log_job_end, log_job_start, resolve_trade_date, write_dropzone_csv
from providers import AKShareFundProvider, load_fund_universe


FIELDNAMES = [
    "fund_id",
    "fund_code",
    "fund_name",
    "fund_type",
    "theme",
    "tracking_target",
    "fund_company",
    "tradable_on_exchange",
    "fee_rate",
    "inception_date",
]

MAPPING_FIELDNAMES = ["industry_id", "fund_id", "mapping_type", "priority_rank"]


def main() -> None:
    settings = get_settings()
    if not settings.akshare_enable:
        raise RuntimeError("AKSHARE_ENABLE=false. Enable AKShare collection before running this job.")

    trade_date = resolve_trade_date(os.getenv("TRADE_DATE"))
    job_name = "akshare-master-fetch"
    batch_id = build_batch_id(trade_date)
    log_job_start(job_name, batch_id, trade_date)

    processed_count = 0
    try:
        provider = AKShareFundProvider()
        universe = load_fund_universe(settings.akshare_fund_universe_path)
        chunks = provider.chunked(universe)
        rows: list[dict[str, object]] = []
        mapping_rows: list[dict[str, object]] = []
        industry_priority: dict[str, int] = {}

        for chunk_index, chunk in enumerate(chunks, start=1):
            print(f"[AKShare master] chunk={chunk_index} size={len(chunk)}")
            for item in chunk:
                rows.append(provider.build_master_row(item).to_csv_row())
                industry_priority[item.industry_id] = industry_priority.get(item.industry_id, 0) + 1
                mapping_rows.append(
                    {
                        "industry_id": item.industry_id,
                        "fund_id": item.fund_id,
                        "mapping_type": "theme",
                        "priority_rank": industry_priority[item.industry_id],
                    }
                )
                processed_count += 1
            if chunk_index < len(chunks):
                provider.cool_down_between_chunks()

        destination = write_dropzone_csv(trade_date, "master/fund_master.csv", FIELDNAMES, rows)
        mapping_destination = write_dropzone_csv(
            trade_date, "master/industry_fund_mapping.csv", MAPPING_FIELDNAMES, mapping_rows
        )
        print(
            f"AKShare fund master written: path={destination} mapping_path={mapping_destination} row_count={processed_count}"
        )
        log_job_end(job_name, batch_id, trade_date, processed_count=processed_count)
    except Exception as exc:
        log_job_end(job_name, batch_id, trade_date, run_status="failed", processed_count=processed_count, error_message=str(exc))
        raise


if __name__ == "__main__":
    main()
