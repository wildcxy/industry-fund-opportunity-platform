from fastapi import APIRouter

from db.queries.watchlist import get_watchlist_summary_snapshot
from db.queries.snapshots import count_rows, get_latest_publish_status

router = APIRouter()


@router.get("")
def get_watchlist_summary() -> dict:
    snapshot = get_watchlist_summary_snapshot()
    return {
        "status": "ok" if snapshot["items"] else "ready_for_data",
        "publish": get_latest_publish_status(),
        "rowCount": {
            "watchlistChangeSummaryDaily": count_rows("watchlist_change_summary_daily")
        },
        "message": "已返回观察页摘要数据。" if snapshot["items"] else "数据库已接通，当前接口等待观察页摘要数据接入。",
        "snapshot": snapshot,
    }
