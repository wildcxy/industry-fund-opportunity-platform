import os

from db.queries.fund_candidates import (
    create_collection_task,
    get_candidate_by_code,
    mark_collection_failed,
    mark_collection_started,
    mark_collection_success,
    normalize_fund_code,
)
from jobs.shared import resolve_trade_date
from jobs.single_fund_collect import collect_single_fund


def main() -> None:
    fund_code = normalize_fund_code(os.getenv("FUND_CODE", ""))
    if not fund_code:
        raise RuntimeError("FUND_CODE is required.")

    candidate = get_candidate_by_code(fund_code)
    if not candidate:
        raise RuntimeError(f"Fund candidate not found: {fund_code}")

    trade_date = resolve_trade_date(os.getenv("TRADE_DATE"))
    task = create_collection_task(candidate["fund_id"], fund_code)
    mark_collection_started(task["task_id"], fund_code)

    try:
        result = collect_single_fund(fund_code, trade_date)
    except Exception as exc:
        mark_collection_failed(task["task_id"], fund_code, str(exc))
        raise

    mark_collection_success(task["task_id"], fund_code, trade_date)
    print(f"Collected user fund: {result}")


if __name__ == "__main__":
    main()
