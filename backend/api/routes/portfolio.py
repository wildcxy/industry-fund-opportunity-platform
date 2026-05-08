from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel

from db.queries.portfolio import DEFAULT_USER_ID, get_latest_decision_view, list_portfolio_positions, upsert_portfolio_positions
from jobs.portfolio_decision_snapshot_daily import build_portfolio_snapshot
from jobs.shared import resolve_trade_date

router = APIRouter()


class PortfolioPositionPayload(BaseModel):
    positionId: str
    fundCode: str | None = None
    fundName: str
    units: float | None = None
    costNav: float | None = None
    marketValueSnapshot: float | None = None
    dayProfitSnapshot: float | None = None
    holdingProfitSnapshot: float | None = None
    holdingReturnSnapshot: float | None = None
    source: str | None = None
    dataDate: date | None = None


class PortfolioPositionsRequest(BaseModel):
    userId: str | None = None
    positions: list[PortfolioPositionPayload]


class PortfolioRefreshRequest(BaseModel):
    userId: str | None = None
    tradeDate: date | None = None


@router.get("")
def portfolio_overview(user_id: str = DEFAULT_USER_ID) -> dict:
    return {
        "status": "ok",
        "positions": list_portfolio_positions(user_id),
        "decisionAssist": get_latest_decision_view(user_id),
    }


@router.post("/positions")
def save_positions(payload: PortfolioPositionsRequest) -> dict:
    user_id = payload.userId or DEFAULT_USER_ID
    positions = [item.model_dump() for item in payload.positions]
    saved = upsert_portfolio_positions(positions, user_id)
    return {"status": "ok", "savedCount": len(saved), "positions": saved}


@router.post("/refresh")
def refresh_portfolio(payload: PortfolioRefreshRequest | None = None) -> dict:
    user_id = payload.userId if payload and payload.userId else DEFAULT_USER_ID
    trade_date = payload.tradeDate if payload and payload.tradeDate else resolve_trade_date()
    result = build_portfolio_snapshot(trade_date, user_id)
    return {"status": "ok", "refresh": result, "decisionAssist": get_latest_decision_view(user_id)}


@router.get("/decision-assist")
def decision_assist(user_id: str = DEFAULT_USER_ID) -> dict:
    return {"status": "ok", **get_latest_decision_view(user_id)}
