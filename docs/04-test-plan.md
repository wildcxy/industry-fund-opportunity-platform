# Test Plan

## Purpose

This test plan defines the minimum checks agents should use when changes affect product behavior, UI, data contracts, or financial wording.

## Build and Type Checks

- Run `npm.cmd run typecheck` after TypeScript changes.
- Run `npm.cmd run build` after route, page, component, or data-contract changes.
- Document any skipped check and why it was skipped.

## Main Flow Checks

- Homepage loads and exposes industry opportunities.
- Industry detail page explains thesis, metrics, risks, and related funds.
- Fund discovery supports filtering, sorting, and view switching if touched.
- Fund comparison shows selected funds and handles missing or insufficient selections.
- Watchlist shows saved items and supports remove/navigation behavior if touched.

## Responsive Checks

- Check desktop and mobile layouts for changed pages.
- Verify tables or dense panels do not overflow without a usable scroll strategy.
- Verify buttons and labels remain readable.

## Data Checks

- Mock data remains shaped according to `types/`.
- Demo or fallback data is not labelled as live market data.
- Empty, loading, and fallback states remain understandable.
- Portfolio valuation snapshots keep current estimated value, estimated profit, and estimated profit percent nullable; missing data renders as unavailable or pending, never as 0.

## Strategy and Risk State Checks

- Watchlist strategy states cover `watching`, `scoring`, `buy_plan_draft`, `paused`, and `removed`.
- Each strategy state shows a human-readable reason, confidence where available, next action, and review link.
- `buy_plan_draft` is labelled as a system-generated plan draft state, not as an instruction to buy or any executable action.
- Industry watch items remain opportunity-tracking items and do not enter staged-buy-plan logic.
- Risk vetoes are visible on watchlist, homepage summary, fund discovery entry point, and portfolio decision review when present.
- Any active risk veto blocks staged-buy draft generation or marks the plan as paused/blocked.
- High-risk, stale-data, or snapshot-only inputs reduce confidence or stop the next plan step.
- Buy-plan draft batches use `ready_for_system_plan`, `pending`, `done`, or `skipped`; no status implies automatic execution.
- Buy-plan pause and invalidation conditions are displayed or preserved with the plan data.
- Post-buy review records include original thesis, actual outcome, risk events, decision, next action, and system-review wording.
- Post-buy review decisions cover `continue_observe`, `pause_buying`, `remove_from_pool`, and `revise_plan`.
- `remove_from_pool` is treated as leaving the buy observation pool, not as an automatic sell instruction.

## Strategy State Regression Checks

- `generateWatchlistStrategyState(input)` returns a concrete `WatchlistStrategyState` for every fund input, including incomplete data.
- `generateWatchlistStrategyStateMap(inputs)` writes alias-compatible map entries for `fundId`, `fundCode`, `fund:{fundCode}`, `code-{fundCode}`, and `user-{fundCode}` when codes exist.
- `scoring` is produced when required evidence is incomplete; it must include `missingEvidence` with machine-readable `code`, field, readable message, impact, and suggested next action.
- Missing-data scenarios distinguish `fetch_failed`, `source_unavailable`, `stale_data`, `manual_needed`, and `not_applicable`.
- Strong risk vetoes produce `paused` and include visible veto reasons.
- `buy_plan_draft` requires `systemConclusionResult: "system_plan_draft_ready"` and must not appear when risk vetoes, stale data, missing evidence, or high concentration are present.
- `removed` appears only for explicit invalidation/archive scenarios, not because a helper score is merely low.
- User strategy assumptions remain labelled as user hypotheses and must include an invalidation condition; they cannot override risk vetoes.
- Backtest summaries are shown only as historical validation, with sample window, benchmark, fee assumption, max drawdown, limitations, and overfitting or insufficient-sample warnings.
- Backtest helper cases cover empty series, insufficient sample, acceptable historical validation, weak/high-overfit validation, benchmark overlap missing, and fee/slippage assumptions; the result remains supporting evidence only.
- AI evidence helper cases cover support, risk, invalidation, mixed, short-term noise, insufficient evidence, low confidence, failed interpretation, stale source, and unresolved conflict; positive AI evidence cannot create plan readiness, while high-impact negative or conflicting evidence must downgrade, pause, or require more evidence.
- CPO/光通信 scenarios cover both long-term thesis support and overheat/concentration risk.

## AI Evidence and System Conclusion Checks

- Supportive AI evidence can improve explanation quality and limited confidence only when it is interpreted, source-linked, not stale, and not marked for system evidence review.
- Negative, invalidating, high-severity, stale, failed, low-confidence, or conflicting AI evidence must create a warning, risk veto, pause state, or missing-evidence item.
- Positive AI evidence cannot create `buy_plan_draft` or `system_plan_draft_ready` by itself.
- Risk vetoes win over supportive AI evidence and must produce `paused` or `system_risk_blocked`.
- Unresolved AI evidence conflict must keep the conclusion at `system_need_more_evidence` or `system_risk_blocked` when it affects the fund thesis.
- `SystemStrategyConclusion` must include conclusion id, ISO conclusion time, result, recommendation reason, core evidence, AI evidence refs, triggered rule checks, risk vetoes, data quality, pause conditions, invalidation conditions, data snapshot summary, and next review date where available.
- `system_plan_draft_ready` can appear only when required rule checks pass and no missing evidence, high risk, stale data, active veto, unresolved AI conflict, or missing valuation/profit prerequisite remains.
- Until `PortfolioValuationSnapshot` is connected, generated fund states should include missing evidence for `portfolioValuationSnapshot` and remain `system_need_more_evidence` rather than showing plan readiness.
- Watchlist and fund detail surfaces must show the system conclusion panel, including blocking rules, AI evidence refs, valuation/profit fields when present, risk vetoes, pause conditions, invalidation conditions, and a non-execution note.
- Static mock scenarios that still show plan readiness without valuation data must be reviewed before they are used as acceptance fixtures for current generation behavior.

## Strategy State UI Checks

- Watchlist batch refresh generates and persists fund strategy states without mutating `STORAGE_KEYS.watchlist`.
- Per-fund refresh writes through `writeWatchlistStrategyState` and updates the visible card after `mergeWatchlistStrategyStates`.
- Watchlist cards show system conclusion, missing evidence, user hypotheses, backtest summary, risk vetoes, and next review date where present.
- Scoring cards provide usable next paths for `manual_needed` and `source_unavailable`.
- Empty strategy groups are hidden unless they contain items; if all funds remain `watching`, the page explains that no fund met scoring/plan/pause thresholds.
- Fund discovery reads the latest generated state from `readWatchlistStrategyStateMap` and shows a compact note on rows/cards.
- Fund detail reads existing strategy state only; it does not recalculate strategy state in the detail UI.
- Fund detail empty state is clear when no strategy state exists and links back to watchlist for full review.
- Strategy state UI wording must not imply automatic execution, guaranteed return, or a direct public investment recommendation.

## Strategy State Performance Checks

- Watchlist strategy refresh runs only when the user clicks refresh; rendering the watchlist must not regenerate states on every render.
- Fund discovery and fund detail read persisted strategy state and must not run scoring/risk generation while rendering.
- Batch strategy refresh should be linear in current fund watch items and should preserve existing state map entries that were not part of the refresh.
- Build output size changes for touched pages should be noted in review when page-level client logic is added.

## Portfolio Valuation Checks

- Portfolio holdings table shows 当前估值 and 预估收益 for each held fund when valuation data is available.
- Each valuation row displays a status label and timestamp; QDII/delayed funds show valuation date or delay reason.
- Missing current value, profit, cost, NAV, or share data renders as `--` or unavailable text, never as `0`.
- `fresh`, `refreshing`, `stale`, `failed`, `unavailable`, and `delayed` states are understandable and visually distinguishable.
- Refresh is scoped to current portfolio holdings only; requests must be built from held `fundCode` values and must not include watchlist-only or all-market funds.
- Refresh runs about once per minute only while the portfolio page is mounted and stops on unmount or when no holdings exist.
- HTTP/network failures and `/api/funds/refresh-visible` partial failures downgrade only the failed held funds to `failed` or `stale`, preserve the previous timestamp, and keep successful held funds updated.
- Local valuation cache keeps active holding snapshots and removes snapshots for positions no longer held.
- Current valuation wording must say it is for holding monitoring/risk review and does not represent a realtime executable price.
- Portfolio page build-size change should be noted because this feature adds client-side valuation state and interval refresh logic.

## Industry Event Checks

- CPO 光通信 appears on homepage industry lists, industry detail, fund discovery theme filters, related funds, and watchlist industry summaries.
- Long-term events cover thesis support, risk or invalidation, short-term noise, mixed evidence, and insufficient evidence.
- Event cards show source type or source name, event date, confidence, freshness, thesis effect, and risk note when available.
- Stale, conflicting, or low-confidence events reduce confidence instead of increasing buy readiness.
- Industry events only affect long-term thesis review and risk controls; they do not directly produce buy, sell, add-position, or automatic execution instructions.
- Mock event data is labelled or worded as sample/demo evidence when it is not from an authorized real source.

## Compliance Checks

- No direct buy/sell language.
- No return guarantees.
- No wording that implies automatic trading or personalized investment advice.
- Risk context is present near rankings, scores, and conclusions.
- Forbidden wording scan includes "must buy", "full position", "guaranteed profit", "risk-free", "必须买", "满仓", "全仓", "稳赚", "无风险", and "立即买入".
- Mock, demo, fallback, snapshot, and real-collected data states are clearly distinguished.
- Buy-related wording stays conditional, evidence-based, staged, and paired with risk controls.

## Documentation-Only Checks

- Confirm no business-code directories were changed unless authorized.
- Confirm Markdown files are UTF-8 without BOM.
- Confirm new docs do not contradict AGENTS.md.
