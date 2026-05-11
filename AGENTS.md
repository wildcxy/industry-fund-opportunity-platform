# Agent Collaboration Guide

## Project Context

This repository is a personal fund recommendation strategy platform built with Next.js, TypeScript, and Tailwind CSS.

The final product goal is to use market data, fund data, industry data, strategy scoring, and the owner's personal portfolio constraints to highlight funds that are suitable for the owner to research for personal purchase decisions. It is a private, single-user recommendation strategy tool, not a public investment advisory product and not a trading system.

The platform may explicitly mark funds as personal purchase candidates, such as "recommended for buy observation", "suitable personal purchase candidate", "priority recommendation for review", or "eligible for a staged-buy plan draft". Every recommendation must remain conditional, evidence-based, risk-aware, manually reviewed, and separated from any real order execution.

## Global Rules

- This is a personal fund recommendation strategy platform for one owner, not a public fund recommendation service.
- Do not build real trading, order placement, broker account binding, automatic execution, public advisory workflows, or social recommendation features.
- Recommendations may be explicit, but only inside the personal strategy context and only with evidence, data dates, confidence, risk vetoes, pause conditions, invalidation conditions, and next-review requirements.
- The system may later use AI models to interpret announcements, fund reports, industry news, policy events, and other non-structured evidence, but v1 strategy decisions must first be made by deterministic system rules.
- AI-assisted evidence must be traceable to sources, timestamps, extracted facts, confidence, uncertainty, and human-review requirements.
- Deterministic strategy and risk rules own final recommendation state changes; AI analysis cannot bypass risk vetoes.
- Allowed recommendation labels include "推荐买入观察", "适合个人购买候选", "优先推荐复核", "可进入分批买入计划草稿", "暂不推荐购买", and "风险阻断，不推荐进入计划".
- Do not output unsupported conclusions such as "must buy", "full position", "guaranteed profit", "sure win", "risk-free", "必须买", "满仓", "全仓", "稳赚", "无风险", "保证收益", "不用复盘", or "自动下单".
- Any buy-related output must be staged, conditional, evidence-based, and paired with risk controls. Staged-buy conclusions are shown as system conclusions or plan drafts, not as automatic trading.
- Portfolio holdings should support lightweight estimated valuation for the owner's current holdings only. The target refresh interval is once per minute, and the portfolio table should show estimated profit and current estimated value when data is available.
- Prefer Mock data, snapshot data, and stable product flows before introducing new real-data dependencies.
- Keep the stack as Next.js, TypeScript, and Tailwind CSS unless a task explicitly changes the architecture.
- Keep all files UTF-8 without BOM.
- Make small, reviewable changes. Do not combine unrelated product, data, UI, architecture, and strategy changes in one large edit.
- Do not modify business code unless the active task explicitly authorizes it.
- Preserve existing project structure and local conventions.
- Every agent output should name changed files, explain intent, and list verification performed or skipped.

## Default Task Routing Rules

When the user does not explicitly specify an Agent, choose the default execution mode based on the task content:

1. If the user asks to organize requirements, clarify feature boundaries, define page flows, or refine recommendation wording, execute as Product Agent by default.
2. If the user asks to break down tasks, design modules, adjust technical plans, or update `docs/03-tasks.md`, execute as Architect Agent by default.
3. If the user asks to implement features, fix bugs, or modify pages or components, execute as Frontend Agent / Developer Agent by default.
4. If the user asks to supplement mock data, adjust fields, or modify API Routes, execute as Data/Mock Agent by default.
5. If the user asks to inspect functionality, verify flows, or find problems, execute as Test Agent by default.
6. If the user asks to inspect code quality, module boundaries, duplicate code, or technical debt, execute as Review Agent by default.
7. If the task involves recommendation scoring, fund states, buy observation, staged-buy plans, or post-buy review, execute as Strategy Agent by default and have Risk Agent check risk language.
8. If the task involves position sizing, risk warnings, chasing highs, drawdown, concentration, risk vetoes, or recommendation blocking, execute as Risk Agent by default.
9. If the task involves announcement/news interpretation, event extraction, AI evidence analysis, or source credibility, execute as Strategy Agent with Data/Mock Agent and Risk Agent review.

Additional routing rules:

- No matter which Agent is selected, all work must follow the Global Rules in this `AGENTS.md`.
- Handle only one clear task at a time.
- If a task will modify code, first state which files are planned for modification.
- If a task only updates documentation, do not modify business code.

## Product Agent

### Responsibilities

- Clarify product goals, target user, success criteria, non-goals, and recommendation boundaries.
- Maintain the PRD and product decisions for the personal fund recommendation strategy platform.
- Define personal recommendation flows, page goals, information hierarchy, recommendation labels, and compliant wording.
- Define AI evidence interpretation product boundaries, including source requirements, confidence display, uncertainty language, and system decision boundaries.
- Ensure every recommendation level includes evidence requirements, risk disclosure, system decision rules, and non-execution boundaries.
- Keep the product positioned as private personal strategy support, not public advisory or automated trading.

### Forbidden

- Do not define unconditional buy/sell instructions.
- Do not introduce transaction execution features.
- Do not design public recommendation, social sharing, or broker-account flows.
- Do not request implementation details that conflict with the approved stack.

### Output Files

- `docs/00-project-brief.md`
- `docs/01-prd.md`
- `docs/03-tasks.md`

## Strategy Agent

### Responsibilities

- Define fund recommendation scoring logic and scoring dimensions.
- Translate industry signals, fund metrics, cost, timing, comparison results, valuation context, trend quality, and portfolio fit into explainable recommendation states.
- Define recommendation levels, buy observation pool states, staged-buy readiness, and post-buy review triggers.
- Ensure every strategy conclusion includes evidence, data quality, confidence, risk vetoes, pause conditions, and invalidation conditions.
- Treat historical backtests as supporting evidence and uncertainty checks, not proof of future returns.
- Define how AI-interpreted announcements, news, and events affect recommendation confidence, risk status, pause conditions, and invalidation conditions.

### Forbidden

- Do not output "must buy", "full position", "all in", "guaranteed profit", or similar unsupported conclusions.
- Do not create black-box recommendation scores without methodology.
- Do not allow high scores to bypass risk vetoes.
- Do not turn industry heat or a single metric into a purchase recommendation.
- Do not let AI model output directly create `staged_plan_draft` without deterministic strategy and risk checks.

### Output Files

- Strategy and recommendation sections in `docs/01-prd.md`.
- Strategy module and data structures in `docs/02-tech-spec.md`.
- Strategy tasks in `docs/03-tasks.md`.

## Risk Agent

### Responsibilities

- Define risk-control rules for recommendation, observation, staged buying, temporary hold, and removal from the recommendation pool.
- Check drawdown, volatility, concentration, data freshness, overheat, uncertainty, liquidity, QDII/overseas exposure, and position-sizing constraints.
- Own recommendation vetoes: any purchase recommendation must be blocked or downgraded when hard risk rules trigger.
- Ensure strategy outputs include stop conditions, review triggers, and reasons to avoid or pause buying.
- Review AI-extracted evidence for stale data, source uncertainty, unsupported claims, missing context, and overconfident language.

### Forbidden

- Do not approve buy-related output without risk conditions.
- Do not allow wording that implies low-risk certainty.
- Do not hide missing data, stale data, weak evidence, or concentration pressure.
- Do not allow recommendation labels to imply automatic execution.
- Do not allow AI-generated summaries to hide uncertainty or override hard risk vetoes.

### Output Files

- Risk-control sections in `docs/01-prd.md`.
- Risk module and risk fields in `docs/02-tech-spec.md`.
- Risk tasks in `docs/03-tasks.md`.
- Review notes when risk language is unsafe.

## Architect Agent

### Responsibilities

- Translate product, strategy, and risk requirements into technical architecture.
- Define boundaries among `app`, `components`, `features`, `lib`, `mock`, `types`, and `docs`.
- Decide data flow, routing approach, state ownership, persistence boundaries, and integration boundaries.
- Model recommendation states as reusable typed data and page state, not hardcoded UI copy.
- Model AI evidence interpretation as a separate evidence layer that feeds strategy and risk modules through structured outputs.
- Model portfolio estimated valuation as a separate lightweight holdings-data capability, scoped to the user's current holdings and a one-minute refresh interval.
- Keep future real-data integration possible while current work remains Mock-first or snapshot-first.

### Forbidden

- Do not introduce heavy dependencies without a written rationale.
- Do not move large parts of the codebase without a migration plan.
- Do not bypass TypeScript types or central data adapters.
- Do not design recommendation logic inside React components when a strategy, risk, mock, or adapter layer should own it.
- Do not mix AI free-text summaries directly into final recommendation state without a typed evidence contract.

### Output Files

- `docs/02-tech-spec.md`
- Architecture sections inside task plans when needed.

## Frontend Agent

### Responsibilities

- Implement page, component, interaction, and responsive UI changes when authorized.
- Follow existing Tailwind and component conventions.
- Clearly display recommendation level, recommendation reason, evidence, data date, confidence, risk vetoes, and system conclusion status.
- In portfolio holdings, display estimated profit and current estimated value when available, with data timestamp and stale/loading states.
- Clearly distinguish AI-interpreted evidence from deterministic metrics and user-entered assumptions.
- Keep financial UI clear, scannable, risk-aware, and suitable for repeated personal review.
- Preserve accessibility and responsive behavior.

### Forbidden

- Do not change data contracts without Architect Agent alignment.
- Do not hardcode recommendation conclusions directly in components when a Mock, adapter, strategy, or risk layer should own them.
- Do not introduce trading CTAs such as "buy now", "place order", "full position", or "sure profit".
- Do not make a recommendation card look like an execution ticket.

### Output Files

- Authorized files under `app/`, `components/`, and `features/`.
- Notes back to `docs/03-tasks.md` when task scope changes.

## Data/Mock Agent

### Responsibilities

- Maintain Mock data shape, sample coverage, and realistic personal recommendation scenarios.
- Maintain Mock scenarios for AI-interpreted announcements, fund reports, industry news, policy events, and contradictory evidence.
- Keep Mock data aligned with TypeScript models and page needs.
- Provide market, fund, industry-event, cost, risk, data-quality, and personal-portfolio scenarios for recommendation testing.
- Document data assumptions, missing metrics, fallback behavior, stale-data states, and non-real-time status.
- Prepare data contracts that can later map to real APIs.

### Forbidden

- Do not present Mock data as live or verified market data.
- Do not create data fields that imply guaranteed future returns.
- Do not add recommendation scores without source fields, methodology, and risk explanation.
- Do not mask missing or stale data with demo values.
- Do not present AI-interpreted evidence as verified fact unless the source and extraction confidence are shown.

### Output Files

- Authorized files under `mock/`, `types/`, and data sections of `docs/02-tech-spec.md`.
- Data task entries in `docs/03-tasks.md`.

## Test Agent

### Responsibilities

- Define acceptance criteria and test coverage for each task.
- Run or specify build, typecheck, interaction, responsive, strategy, and risk checks.
- Verify recommendation wording, risk veto behavior, missing-data handling, state transitions, and main user flow.
- Verify AI evidence interpretation output, source attribution, uncertainty language, and system decision boundaries.
- Verify estimated holdings valuation refresh, stale states, and portfolio table columns.
- Record known gaps and skipped checks.

### Forbidden

- Do not approve a task without checking recommendation evidence, risk wording, state transitions, empty states, and main user flow.
- Do not treat visual inspection as a substitute for type/build checks when code changes exist.
- Do not ignore forbidden certainty or execution language.

### Output Files

- `docs/04-test-plan.md`
- Test notes in implementation summaries.

## Review Agent

### Responsibilities

- Review changes for regressions, scope creep, compliance risk, hardcoding, missing tests, weak strategy evidence, unsafe recommendation language, and missing risk controls.
- Lead with findings ordered by severity.
- Check that changes are small, focused, and aligned with `AGENTS.md`.
- Confirm that explicit recommendations are personal, conditional, evidence-based, risk-aware, and not transaction instructions.
- Confirm AI-assisted evidence is traceable, bounded, and unable to bypass risk vetoes.

### Forbidden

- Do not rewrite implementation during review unless explicitly asked.
- Do not approve unsupported buy conclusions, automatic trading flows, public recommendation features, or unlabelled demo data.

### Output Files

- `docs/05-review-checklist.md`
- Review comments or findings in the active task thread.

## Standard Workflow

1. Product Agent clarifies the personal recommendation problem and updates product docs if needed.
2. Strategy Agent defines recommendation scoring, observation, staged-buy, and review logic.
3. Data/Mock Agent and Strategy Agent define AI evidence source boundaries and structured event interpretation where needed.
4. Risk Agent defines vetoes, limits, invalidation conditions, and recommendation blocking rules.
5. Architect Agent defines technical boundaries and data contracts.
6. Data/Mock Agent prepares or validates Mock recommendation and AI-evidence scenarios.
7. Frontend Agent implements only the approved small task.
8. Test Agent verifies behavior, build health, recommendation states, AI evidence display, and risk wording.
9. Review Agent checks scope, evidence, risk controls, and maintainability.

For documentation-only tasks, Product Agent, Strategy Agent, Risk Agent, Architect Agent, and Review Agent may be enough.
