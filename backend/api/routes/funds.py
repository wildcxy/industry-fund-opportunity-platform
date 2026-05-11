from datetime import date
import os

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from db.queries.fund_candidates import (
    create_collection_task,
    get_candidate_by_code,
    get_collection_status,
    list_candidate_statuses,
    mark_collection_failed,
    mark_collection_started,
    mark_collection_success,
    normalize_fund_code,
    upsert_candidate,
)
from db.queries.funds import list_funds_snapshot
from db.queries.holdings import get_fund_holding_view
from db.queries.snapshots import count_rows, get_latest_publish_status
from jobs.shared import resolve_trade_date
from jobs.single_fund_collect import collect_single_fund, get_cached_single_fund_collection
from providers import AKShareFundProvider, ProProvider

router = APIRouter()


class CandidateRequest(BaseModel):
    fundCode: str
    fundName: str
    fundType: str | None = None
    fundCompany: str | None = None
    theme: str | None = None
    trackingTarget: str | None = None
    query: str | None = None


class RefreshVisibleRequest(BaseModel):
    fundCodes: list[str]


@router.get("")
def list_funds() -> dict:
    snapshot = list_funds_snapshot()
    return {
        "status": "ok" if snapshot["items"] else "ready_for_data",
        "publish": get_latest_publish_status(),
        "rowCount": {
            "fundMaster": count_rows("fund_master"),
            "fundDailyMetrics": count_rows("fund_daily_metrics"),
            "fundFeeRule": count_rows("fund_fee_rule"),
            "fundHoldingCostSnapshot": count_rows("fund_holding_cost_snapshot")
        },
        "message": "已返回基金发现快照数据。" if snapshot["items"] else "数据库已接通，当前接口等待基金主数据与日指标数据接入。",
        "snapshot": snapshot,
    }


@router.get("/search")
def search_funds(q: str = Query(..., min_length=1), limit: int = Query(12, ge=1, le=30)) -> dict:
    provider = AKShareFundProvider()
    pro_provider = ProProvider()
    statuses = list_candidate_statuses()
    raw_items = []
    seen_codes: set[str] = set()
    try:
        if pro_provider.enabled:
            for item in pro_provider.search_funds(q, limit=limit):
                if item["fundCode"] not in seen_codes:
                    raw_items.append(item)
                    seen_codes.add(item["fundCode"])
    except Exception as exc:
        print(f"[fund_search] Tushare search skipped query={q} error={exc}")

    ak_limit = max(limit - len(raw_items), 0) or limit
    for item in provider.search_funds(q, limit=ak_limit):
        if item["fundCode"] not in seen_codes:
            raw_items.append(item)
            seen_codes.add(item["fundCode"])

    results = []
    for item in raw_items[:limit]:
        status = statuses.get(item["fundCode"])
        results.append(
            {
                **item,
                "isAdded": status is not None,
                "candidateStatus": status["candidateStatus"] if status else None,
                "taskStatus": status["taskStatus"] if status else None,
                "lastSuccessTradeDate": status["lastSuccessTradeDate"] if status else None,
                "lastErrorMessage": status["lastErrorMessage"] if status else None,
            }
        )

    return {"status": "ok", "query": q, "items": results}


@router.post("/refresh-visible")
def refresh_visible_funds(payload: RefreshVisibleRequest) -> dict:
    trade_date = resolve_trade_date(os.getenv("TRADE_DATE"))
    normalized_codes: list[str] = []
    for code in payload.fundCodes:
        normalized = normalize_fund_code(code)
        if normalized and normalized not in normalized_codes:
            normalized_codes.append(normalized)

    # V1 keeps this synchronous so the button has an immediate effect. Keep the
    # batch small to avoid hammering AKShare and leave room for retries/cooldown.
    normalized_codes = normalized_codes[:30]
    results = []
    success_count = 0
    cached_count = 0
    provider = AKShareFundProvider()
    for code in normalized_codes:
        try:
            cached = get_cached_single_fund_collection(code, trade_date)
            if cached:
                results.append({"fundCode": code, "status": "cached", "collection": cached})
                success_count += 1
                cached_count += 1
                continue

            collection = collect_single_fund(code, trade_date, provider)
            results.append({"fundCode": code, "status": "ok", "collection": collection})
            success_count += 1
        except Exception as exc:
            results.append({"fundCode": code, "status": "failed", "message": str(exc)[:1000]})

    return {
        "status": "ok" if success_count == len(normalized_codes) else "partial",
        "tradeDate": trade_date.isoformat(),
        "requestedCount": len(normalized_codes),
        "successCount": success_count,
        "cachedCount": cached_count,
        "failedCount": len(normalized_codes) - success_count,
        "results": results,
    }


@router.post("/candidates")
def add_candidate(payload: CandidateRequest) -> dict:
    candidate = upsert_candidate(
        fund_code=payload.fundCode,
        fund_name_query=payload.query,
        matched_fund_name=payload.fundName,
        matched_fund_type=payload.fundType,
        matched_fund_company=payload.fundCompany,
        theme=payload.theme,
        tracking_target=payload.trackingTarget,
    )
    return {"status": "ok", "candidate": candidate}


@router.post("/{fund_code}/collect")
def collect_candidate(fund_code: str) -> dict:
    normalized = normalize_fund_code(fund_code)
    candidate = get_candidate_by_code(normalized)
    if not candidate:
        raise HTTPException(status_code=404, detail="Fund must be added to candidates before collection.")

    trade_date = resolve_trade_date(os.getenv("TRADE_DATE"))
    cached = get_cached_single_fund_collection(normalized, trade_date)
    if cached:
        return {
            "status": "cached",
            "collection": cached,
            "candidate": get_collection_status(normalized),
        }

    task = create_collection_task(candidate["fund_id"], normalized)
    mark_collection_started(task["task_id"], normalized)

    try:
        result = collect_single_fund(normalized, trade_date)
    except Exception as exc:
        mark_collection_failed(task["task_id"], normalized, str(exc))
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    mark_collection_success(task["task_id"], normalized, trade_date)
    return {
        "status": "ok",
        "taskId": task["task_id"],
        "collection": result,
        "candidate": get_collection_status(normalized),
    }


@router.get("/{fund_code}/collection-status")
def collection_status(fund_code: str) -> dict:
    return {"status": "ok", "candidate": get_collection_status(fund_code)}


@router.get("/{fund_code}/holdings")
def fund_holdings(fund_code: str) -> dict:
    return get_fund_holding_view(fund_code)
