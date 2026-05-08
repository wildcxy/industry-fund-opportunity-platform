from fastapi import FastAPI

from api.routes.compare import router as compare_router
from api.routes.funds import router as funds_router
from api.routes.industries import router as industries_router
from api.routes.portfolio import router as portfolio_router
from api.routes.watchlist import router as watchlist_router
from db.queries.health import ping_database

app = FastAPI(
    title="Industry Fund Opportunity API",
    description="盘后快照驱动的只读 API，服务行业机会榜单、基金筛选与基金对比页面。",
    version="0.1.0",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "database": ping_database()}


app.include_router(industries_router, prefix="/api/industries", tags=["industries"])
app.include_router(funds_router, prefix="/api/funds", tags=["funds"])
app.include_router(compare_router, prefix="/api/compare", tags=["compare"])
app.include_router(portfolio_router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(watchlist_router, prefix="/api/watchlist-summary", tags=["watchlist"])
