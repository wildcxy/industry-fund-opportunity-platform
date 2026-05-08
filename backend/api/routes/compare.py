from fastapi import APIRouter, Query

from db.queries.funds import compare_funds_snapshot
from db.queries.snapshots import count_rows, get_latest_publish_status

router = APIRouter()


@router.get("")
def compare_funds(ids: str = Query(default="")) -> dict:
    fund_ids = [item for item in ids.split(",") if item]
    snapshot = compare_funds_snapshot(fund_ids)
    return {
        "status": "ok" if snapshot["items"] else "ready_for_data",
        "fundIds": fund_ids,
        "publish": get_latest_publish_status(),
        "rowCount": {
            "fundCompareDaily": count_rows("fund_compare_daily"),
            "fundHoldingCostSnapshot": count_rows("fund_holding_cost_snapshot"),
            "fundFeeRule": count_rows("fund_fee_rule"),
        },
        "message": "已返回基金对比快照数据。" if snapshot["items"] else "数据库已接通，当前接口等待基金对比快照数据接入。",
        "snapshot": snapshot,
    }
