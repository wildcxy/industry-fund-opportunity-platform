# Review Checklist

## Scope

- Is the change limited to the requested task?
- Are unrelated refactors avoided?
- Are affected files clearly listed?
- Does the change respect existing project structure?

## Product and Compliance

- Does the wording avoid direct buy/sell advice?
- Does the change avoid real trading or account integration?
- Are Mock, demo, fallback, or estimated data clearly treated as such?
- Are risk explanations present where needed?
- Are strategy, rating, or portfolio labels translated into observation/review language instead of exposed as direct `Buy`/`Sell` instructions?
- Do buy-related states remain conditional, staged, evidence-based, and paired with risk controls?

## Technical Quality

- Does the implementation follow Next.js, TypeScript, and Tailwind conventions?
- Are data transformations placed in adapters or helpers instead of being scattered through components?
- Are TypeScript types updated with the data shape?
- Are hardcoded values justified or moved to Mock/config/documented constants?
- Does a risk veto block staged-plan drafting or clearly move the item to paused/blocked review?
- Are stale, snapshot-only, or partial data states prevented from producing high-confidence plan states?
- Does portfolio valuation refresh use held-fund scope and avoid all-market, watchlist-only, or repeated unnecessary refresh loops?
- Do failed or partial valuation refreshes preserve previous timestamps and downgrade only failed held funds instead of marking stale data as fresh?

## Strategy and Risk Flow

- Are all watchlist strategy states (`watching`, `scoring`, `buy_plan_draft`, `paused`, `removed`) represented and safely worded?
- Is `buy_plan_draft` always described as a system-generated draft state, not an execution state?
- Is `buy_plan_draft` backed by `systemConclusionResult: "system_plan_draft_ready"`?
- Does `system_plan_draft_ready` require all blocking system conclusion rules to pass instead of coexisting with failed valuation, risk, evidence, concentration, or plan-limit checks?
- Does every generated system conclusion include an ISO conclusion time, triggered rule checks, risk vetoes, data quality, pause conditions, invalidation conditions, data snapshot summary, and source-linked AI evidence refs where applicable?
- Does missing `portfolioValuationSnapshot` keep generated states in `system_need_more_evidence` until current valuation and estimated profit are available?
- Are industry watch items kept out of fund staged-buy-plan logic?
- Are plan batches marked `ready_for_system_plan`, `pending`, `done`, or `skipped` without implying automatic execution?
- Do strategy refresh actions write only `STORAGE_KEYS.watchlistStrategyState` and avoid mutating watchlist membership?
- Do alias keys cover `fundId`, `fundCode`, `fund:{fundCode}`, `code-{fundCode}`, and `user-{fundCode}` where applicable?
- Does `scoring` include actionable `missingEvidence` with reason code, field, user-readable message, impact, and next action?
- Are `fetch_failed`, `source_unavailable`, `stale_data`, `manual_needed`, and `not_applicable` handled distinctly?
- Do hard risk vetoes force `paused` or a risk-blocked system conclusion before any plan draft can appear?
- Is `removed` generated only for explicit invalidation/archive scenarios?
- Are user-added assumptions labelled as personal hypotheses with invalidation conditions?
- Are backtest summaries framed as historical validation with sample window, benchmark, fee assumptions, drawdown, limitations, and overfitting/sample-size caveats?
- Is AI evidence treated as structured evidence only, never as a direct final recommendation or plan-draft creator?
- Do supportive AI evidence items remain bounded to explanation/confidence, while negative, invalidating, stale, failed, low-confidence, high-severity, or conflicting items downgrade, block, or require more evidence?
- If a caller provides a precomputed risk assessment, can AI-related vetoes and conflicts still not be bypassed in the strategy/state layer?
- Are CPO/光通信 events allowed to affect confidence and risk only, rather than direct plan readiness?
- Do post-buy reviews include original thesis, actual outcome, risk events, decision, and next action?
- Does `remove_from_pool` mean leaving the buy observation pool, not an automatic sell action?
- Do post-buy decisions cover `continue_observe`, `pause_buying`, `remove_from_pool`, and `revise_plan`?
- Do industry events remain long-term thesis evidence rather than short-term trading signals?
- Are CPO/光通信 events mapped to AI communication infrastructure without implying guaranteed demand or returns?
- Are source boundaries clear: authorized API, manual import, internal tag, or Mock only?
- Are stale, low-confidence, or conflicting events handled with lower confidence and risk notes?
- Is any non-authorized scraping, copied article text, or unclear source attribution flagged?

## UI Quality

- Is the interface readable and scannable?
- Does it work on desktop and mobile?
- Are empty and error states handled?
- Are controls named clearly?
- Does watchlist show system conclusions, missing evidence, risk vetoes, historical validation, and user hypotheses without crowding out the main action?
- Does fund discovery show the persisted strategy state without recalculating it?
- Does fund detail read the persisted strategy state, show a clear empty state, and link back to watchlist?
- Does the portfolio holdings table show 当前估值 and 预估收益 with timestamp/status labels and without rendering missing data as 0?
- Does QDII or delayed valuation display date/delay reason, and does failed/unavailable valuation explain the missing value?

## Testing

- Were typecheck and build run when code changed?
- Were main user flows checked?
- Were skipped checks documented?
- Was a forbidden wording scan run for automatic execution, certainty language, and old manual-review wording?
- Was watchlist refresh checked for unnecessary recalculation or accidental watchlist membership mutation?
- Was portfolio valuation refresh checked for held-fund-only scope, approximately one-minute interval, cleanup on unmount, partial failure handling, and no executable-price wording?

## Final Review Output

Reviews should lead with findings ordered by severity. If there are no findings, say so directly and mention any residual risk or skipped checks.
