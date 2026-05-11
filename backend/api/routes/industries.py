from datetime import datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException

from db.queries.industries import get_homepage_snapshot, get_industry_detail_snapshot
from db.queries.snapshots import count_rows, get_latest_publish_status
from jobs.industry_news_event_refresh import refresh_industry_news_events
from jobs.industry_top_fund_refresh import refresh_industry_top_funds
from jobs.page_snapshot_build import main as rebuild_page_snapshots
from jobs.shared import resolve_trade_date

router = APIRouter()

_TOP_FUND_REFRESH_STATE: dict[str, Any] = {
    "status": "idle",
    "message": "行业 Top10 基金池尚未启动本轮刷新。",
    "startedAt": None,
    "endedAt": None,
    "tradeDate": None,
    "report": None,
    "error": None,
}
_NEWS_EVENT_REFRESH_STATE: dict[str, Any] = {
    "status": "idle",
    "message": "行业新闻事件尚未启动本轮刷新。",
    "startedAt": None,
    "endedAt": None,
    "tradeDate": None,
    "provider": None,
    "report": None,
    "error": None,
}


def _set_refresh_state(**updates: Any) -> None:
    _TOP_FUND_REFRESH_STATE.update(updates)


def _set_news_event_refresh_state(**updates: Any) -> None:
    _NEWS_EVENT_REFRESH_STATE.update(updates)


def _run_top_fund_refresh_job(trade_date) -> None:
    _set_refresh_state(
        status="running",
        message="正在后台拉取行业 Top10 基金池，请稍后查看进度。",
        startedAt=datetime.now().isoformat(timespec="seconds"),
        endedAt=None,
        tradeDate=trade_date.isoformat(),
        report=None,
        error=None,
    )
    try:
        report = refresh_industry_top_funds(trade_date)
        rebuild_page_snapshots()
        processed_count = sum(item.get("savedCount", 0) for item in report.get("industries", []))
        _set_refresh_state(
            status="success",
            message=f"已刷新 {len(report.get('industries', []))} 个行业、{processed_count} 只行业排名基金，并重建页面快照。",
            endedAt=datetime.now().isoformat(timespec="seconds"),
            report=report,
            error=None,
        )
    except Exception as exc:
        _set_refresh_state(
            status="failed",
            message="行业 Top10 基金池刷新失败，请查看后端日志。",
            endedAt=datetime.now().isoformat(timespec="seconds"),
            error=str(exc),
        )


def _run_news_event_refresh_job(trade_date, provider: str, limit: int) -> None:
    _set_news_event_refresh_state(
        status="running",
        message="正在后台拉取热点新闻并进行行业归因，请稍后查看进度。",
        startedAt=datetime.now().isoformat(timespec="seconds"),
        endedAt=None,
        tradeDate=trade_date.isoformat(),
        provider=provider,
        report=None,
        error=None,
    )
    try:
        report = refresh_industry_news_events(trade_date, provider_name=provider, limit=limit)
        _set_news_event_refresh_state(
            status="success",
            message=f"已扫描 {report.get('scannedCount', 0)} 条新闻，写入 {report.get('savedCount', 0)} 条行业事件，并重建页面快照。",
            endedAt=datetime.now().isoformat(timespec="seconds"),
            report=report,
            error=None,
        )
    except Exception as exc:
        _set_news_event_refresh_state(
            status="failed",
            message="行业新闻事件刷新失败，请检查新闻源配置或后端日志。",
            endedAt=datetime.now().isoformat(timespec="seconds"),
            error=str(exc),
        )

@router.get("")
def list_industries() -> dict:
    snapshot = get_homepage_snapshot()
    return {
        "status": "ok" if snapshot else "ready_for_data",
        "publish": get_latest_publish_status(),
        "rowCount": {
            "homepageSnapshots": count_rows("homepage_snapshot_daily"),
            "industryOpportunities": count_rows("industry_opportunity_daily")
        },
        "message": "已返回首页快照数据。" if snapshot else "数据库已接通，当前接口等待盘后快照数据接入。",
        "snapshot": snapshot,
    }


@router.get("/refresh-top-funds/status")
def get_refresh_top_funds_status() -> dict:
    return dict(_TOP_FUND_REFRESH_STATE)


@router.get("/refresh-news-events/status")
def get_refresh_news_events_status() -> dict:
    return dict(_NEWS_EVENT_REFRESH_STATE)


@router.post("/refresh-news-events")
def refresh_news_events(background_tasks: BackgroundTasks, provider: str = "jin10", limit: int = 80) -> dict:
    if _NEWS_EVENT_REFRESH_STATE.get("status") == "running":
        return {
            **_NEWS_EVENT_REFRESH_STATE,
            "message": "行业新闻事件正在后台刷新中，请稍后查看状态。",
        }

    trade_date = resolve_trade_date()
    normalized_limit = max(20, min(limit, 200))
    _set_news_event_refresh_state(
        status="queued",
        message="行业新闻事件刷新任务已提交，后台即将拉取新闻并筛选热点事件。",
        startedAt=datetime.now().isoformat(timespec="seconds"),
        endedAt=None,
        tradeDate=trade_date.isoformat(),
        provider=provider,
        report=None,
        error=None,
    )
    background_tasks.add_task(_run_news_event_refresh_job, trade_date, provider, normalized_limit)
    return {
        "status": "queued",
        "tradeDate": trade_date.isoformat(),
        "provider": provider,
        "message": "已提交后台刷新任务。完成后行业详情页会显示匹配到的热点事件。",
    }


@router.post("/refresh-top-funds")
def refresh_top_funds(background_tasks: BackgroundTasks) -> dict:
    if _TOP_FUND_REFRESH_STATE.get("status") == "running":
        return {
            **_TOP_FUND_REFRESH_STATE,
            "message": "行业 Top10 基金池正在后台刷新中，请稍后查看状态。",
        }

    trade_date = resolve_trade_date()
    _set_refresh_state(
        status="queued",
        message="行业 Top10 基金池刷新任务已提交，后台即将开始拉取。",
        startedAt=datetime.now().isoformat(timespec="seconds"),
        endedAt=None,
        tradeDate=trade_date.isoformat(),
        report=None,
        error=None,
    )
    background_tasks.add_task(_run_top_fund_refresh_job, trade_date)
    return {
        "status": "queued",
        "tradeDate": trade_date.isoformat(),
        "message": "已提交后台刷新任务。该任务通常需要数分钟，请等待状态更新。",
    }


@router.get("/{industry_id}")
def get_industry_detail(industry_id: str) -> dict:
    snapshot = get_industry_detail_snapshot(industry_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Industry snapshot not found")
    return {
        "status": "ok",
        "industryId": industry_id,
        "publish": get_latest_publish_status(),
        "rowCount": {
            "industryDetailSnapshots": count_rows("industry_detail_snapshot_daily"),
            "industryEvents": count_rows("industry_events_daily")
        },
        "message": "已返回行业详情快照数据。",
        "snapshot": snapshot,
    }
