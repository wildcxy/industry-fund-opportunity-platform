# Industry Fund Platform Portable Manifest

Generated for Codex-assisted migration.

## Project Identity

- Product: 行业基金机会捕捉与个人持仓决策辅助平台
- Frontend: Next.js 15 + React 19 + Tailwind + TypeScript
- Backend: FastAPI + PostgreSQL + AKShare
- Current goal: personal fund watchlist, real fund discovery, portfolio screenshot import, post-close fund refresh, portfolio decision assistance

## Important Current Capabilities

- Fund discovery supports real fund search/add/collect via AKShare.
- Portfolio page supports Alipay screenshot draft import and manual holdings.
- 14 current portfolio funds have been matched to real fund codes and collected.
- Portfolio strategy distinguishes:
  - long-hold QDII/overseas assets
  - high-beta themes such as semiconductor, AI, CPO-like themes, BeiZheng, nonferrous metals
  - trend deterioration watchlist
  - data quality / real NAV matching
- Fund names in portfolio/watchlist link to `/funds/[fundCode]` detail review pages.

## Key Commands

Recommended one-shot restore after installing PostgreSQL, Node.js and Python:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\portable-setup-windows.ps1
```

Defaults baked into the portable package:

```text
Database user: postgres
Database password: 123456
Database name: game_data
Database URL: postgresql://postgres:123456@localhost:5432/game_data
```

If the PostgreSQL password is different:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\portable-setup-windows.ps1 -DatabasePassword "your_password"
```

Frontend:

```powershell
cd E:\game
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

Backend:

```powershell
cd E:\game\backend
python -m pip install -r requirements.txt -t .packages
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-api.ps1
```

Run backend job:

```powershell
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 portfolio_decision_snapshot_daily
```

## Database

Expected database:

```text
postgresql://postgres:123456@localhost:5432/game_data
```

Portable export should include:

```text
db/game_data_dump.sql
db/restore-db.ps1
```

If database is restored correctly:

- `GET http://127.0.0.1:8000/api/funds` returns real fund items.
- `GET http://127.0.0.1:8000/api/portfolio/decision-assist` returns a valuation and strategy.

## Files Worth Reading First

- `docs/portable-transfer-guide.md`
- `README.md`
- `backend/README.md`
- `docs/prd-v1-industry-fund-opportunity.md`
- `docs/portfolio-decision-assistant-v1.md`
- `docs/agents/financial-product-manager-agent.md`
- `docs/agents/solution-architect-agent.md`
- `docs/agents/backend-solution-architect-agent.md`

## Important Code Paths

- Frontend fund discovery: `features/funds/fund-discovery-client.tsx`
- Fund detail review: `app/funds/[fundCode]/page.tsx`
- Portfolio page: `features/portfolio/portfolio-client.tsx`
- Portfolio decision panel: `features/portfolio/portfolio-decision-panel.tsx`
- Fund alias mapping: `lib/fund-aliases.ts`
- Backend fund routes: `backend/api/routes/funds.py`
- Backend portfolio routes: `backend/api/routes/portfolio.py`
- AKShare provider: `backend/providers/akshare_provider.py`
- Single fund collect: `backend/jobs/single_fund_collect.py`
- Portfolio strategy job: `backend/jobs/portfolio_decision_snapshot_daily.py`

## Known Caveats

- This is not a trading system and must not issue direct buy/sell orders.
- AKShare endpoints can be unstable; refresh jobs include retries and should avoid high-frequency calls.
- QDII NAV can lag; strategy copy must explain delay and FX exposure.
- Fund holdings are disclosure-based and can be stale; rebalance inference is only a clue.
- Frontend localStorage may still contain old browser state on the original machine; database export is the canonical portable state.
