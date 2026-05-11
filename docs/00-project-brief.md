# Project Brief

## Overview

This project is a personal fund recommendation strategy platform built with Next.js, TypeScript, and Tailwind CSS.

Its final goal is to use market data, fund data, industry data, strategy scoring, risk checks, and the owner's personal portfolio constraints to identify and highlight funds that are suitable for the owner to research for personal purchase decisions. The product should help the owner move from broad market opportunity discovery to a short list of personal purchase candidates, staged-buy plan drafts, and post-buy review.

The platform is private and single-user by default. It may use explicit personal recommendation labels, but every recommendation must be conditional, evidence-based, risk-aware, and manually reviewed.

## Core Research And Recommendation Flow

1. Discover market, industry, and theme opportunities.
2. Verify the logic, evidence, freshness, and risk context behind an industry.
3. Screen related funds by quality, cost, risk, scale, style, and data completeness.
4. Compare selected funds by risk-return profile, long-hold cost, fund representation, and portfolio fit.
5. Generate personal recommendation states for candidate funds.
6. Add funds to a buy observation pool when they deserve continued purchase review.
7. Generate staged-buy plan drafts only when evidence is sufficient and risk vetoes are not triggered.
8. Review bought funds against their original thesis, risk assumptions, and current portfolio exposure.

## AI Evidence Interpretation

The platform should later support an AI-assisted evidence layer for announcements, fund reports, industry news, policy events, and long-form research inputs.

The AI layer should not make final purchase decisions. Its role is to transform non-structured evidence into structured strategy and risk inputs:

- Source, publication time, and affected funds or industries.
- Event category and extracted facts.
- Impact direction: support, risk, invalidation, mixed, short-term noise, or insufficient evidence.
- Confidence and uncertainty.
- Risk signals and possible thesis changes.
- Whether the system should require additional evidence before emitting a stronger conclusion.

Deterministic strategy rules and risk vetoes decide whether a fund can remain a candidate, be paused, be blocked, or enter a staged-buy plan draft. AI evidence can support the decision, but it does not replace system rules.

## Portfolio Estimated Valuation

The portfolio page should later support lightweight estimated valuation for the owner's current holdings. This is not a full real-time trading feed; it is a practical refresh for the funds already held by the owner.

Target behavior:

- Refresh current holding valuation about once per minute while the portfolio page is active.
- Add two holdings-table fields: estimated profit and current estimated value.
- Show valuation timestamp, loading state, stale state, and unavailable state.
- Use the feature only for personal portfolio monitoring and risk review, not for automatic trading.

## Product Boundary

This is not a trading product. It does not place orders, bind brokerage accounts, execute strategies, or automate any buy/sell action.

This is also not a public investment advisory platform. Recommendation output is scoped to the owner's personal workflow and must not be written as public advice, universal suitability, guaranteed return, or transaction instruction.

Allowed recommendation labels include:

- `推荐买入观察`
- `适合个人购买候选`
- `优先推荐复核`
- `可进入分批买入计划草稿`
- `暂不推荐购买`
- `风险阻断，不推荐进入计划`

Every recommendation must include:

- Recommendation reason.
- Core evidence and data date.
- AI-interpreted evidence summary when applicable.
- Data quality status.
- Confidence level.
- Risk vetoes and warnings.
- Pause conditions.
- Invalidation conditions.
- Next review requirement.
- System conclusion or plan-draft status.

Forbidden output includes unsupported certainty or execution language such as `必须买`, `满仓`, `全仓`, `稳赚`, `无风险`, `保证收益`, `不用复盘`, and `自动下单`.

## Current Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: Shared UI and interaction components.
- `features/`: Domain-specific interactive modules.
- `lib/`: Formatting, storage, adapters, strategy helpers, risk helpers, and backend access.
- `mock/`: Sample data for product demonstration and fallback flows.
- `types/`: Core TypeScript contracts.
- `docs/`: Product, architecture, testing, and collaboration documentation.

## Success Criteria

- The project goal is consistently described as a personal fund recommendation strategy platform.
- Recommendation labels are explicit enough to help the owner prioritize personal purchase research.
- No recommendation is shown without evidence, risk controls, data quality, and system conclusion status.
- The portfolio page can show estimated profit and current estimated value for held funds with a one-minute refresh target.
- Existing pages remain part of one coherent chain: home, industry detail, fund discovery, fund detail, compare, watchlist, portfolio, and decision assistant.
- Strategy scoring, buy observation pool, staged-buy draft, and post-buy review are treated as upgrades to the existing flow rather than a separate trading product.
- Mock and snapshot data remain clearly labelled when they are not live market data.

## Collaboration Goal

The Agent collaboration system exists to keep work small, reviewable, and role-based. Each agent should produce clear artifacts, stay inside its responsibility boundary, and avoid changing unrelated parts of the codebase.

All agents must preserve the same product line: personal recommendation is allowed; public advisory, automatic trading, guaranteed outcome, and unsupported certainty are not.
