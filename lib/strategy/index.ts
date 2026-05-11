import { evaluateFundRisk } from "@/lib/risk";
import {
  BuyPlan,
  AiEvidenceItem,
  FundListItem,
  FundScore,
  FundScoreComponents,
  FundScoreState,
  IndustryEventImpactSummary,
  RiskAssessment,
  StrategyConfidence,
  WatchlistStrategyBacktestSummary,
  WatchlistStrategyManualAssumptionRef,
  WatchlistStrategyMissingEvidence,
  WatchlistStrategyState
} from "@/types";
import { summarizeAiEvidenceForStrategy } from "@/lib/strategy/ai-evidence";
import { buildSystemStrategyConclusion } from "@/lib/strategy/system-conclusion";

export { buildWatchlistStrategyBacktestSummary } from "@/lib/strategy/backtest";
export { summarizeAiEvidenceForStrategy } from "@/lib/strategy/ai-evidence";
export { buildSystemStrategyConclusion } from "@/lib/strategy/system-conclusion";

export type StrategyRiskInput = {
  riskLevel?: "low" | "medium" | "high";
  vetoes?: string[];
  warnings?: string[];
  dataQuality?: "complete" | "partial" | "snapshot_only" | "stale";
};

export type CalculateFundScoreInput = {
  fund: Pick<FundListItem, "fundId" | "fundName"> &
    Partial<Pick<FundListItem, "fundCode" | "return1m" | "return3m" | "return6m" | "maxDrawdown" | "volatility" | "aum" | "feeRate" | "dataCompleteness" | "missingMetrics">>;
  industryOpportunityScore?: number | null;
  portfolioFitScore?: number | null;
  risk?: StrategyRiskInput;
  scoreDate?: string;
};

export type GenerateBuyPlanDraftInput = {
  fundScore: FundScore;
  riskAssessment: RiskAssessment;
  createdAt?: string;
  maxExposurePercent?: number;
  batchCount?: number;
};

export type GenerateBuyPlanDraftResult = {
  plan: BuyPlan | null;
  blockedReasons: string[];
};

type WatchlistStrategyFundInput = Pick<FundListItem, "fundId" | "fundName" | "fundType" | "theme"> &
  Partial<
    Pick<
      FundListItem,
      | "fundCode"
      | "return1m"
      | "return3m"
      | "return6m"
      | "maxDrawdown"
      | "volatility"
      | "aum"
      | "feeRate"
      | "dataCompleteness"
      | "missingMetrics"
      | "metricTradeDate"
      | "metricUpdatedAt"
    >
  >;

export type WatchlistStrategyPortfolioContext = {
  themeExposurePercent?: number | null;
  fundExposurePercent?: number | null;
  qdiiExposurePercent?: number | null;
  maxThemeExposurePercent?: number | null;
  maxFundExposurePercent?: number | null;
  maxQdiiExposurePercent?: number | null;
};

export type WatchlistStrategyInvalidation = {
  reason: string;
  invalidatedAt?: string;
};

export type GenerateWatchlistStrategyStateInput = {
  fund: WatchlistStrategyFundInput;
  industryEventSummary?: IndustryEventImpactSummary | null;
  riskAssessment?: RiskAssessment | null;
  portfolioContext?: WatchlistStrategyPortfolioContext;
  manualAssumptions?: WatchlistStrategyManualAssumptionRef[];
  aiEvidence?: AiEvidenceItem[];
  backtestSummary?: WatchlistStrategyBacktestSummary | null;
  buyPlanDraftId?: string;
  explicitInvalidation?: WatchlistStrategyInvalidation | null;
  asOfDate?: string;
};

const METHOD_VERSION = "mock-strategy-score-v1";
const BUY_PLAN_METHOD_VERSION = "mock-buy-plan-draft-v1";
const WATCHLIST_STATE_METHOD_VERSION = "watchlist-strategy-state-v1";

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scorePositiveReturn(value: number | null | undefined, neutral = 50) {
  if (value === null || value === undefined || !Number.isFinite(value)) return neutral;
  return clampScore(neutral + value * 2.5);
}

function scoreDrawdown(maxDrawdown: number | null | undefined) {
  if (maxDrawdown === null || maxDrawdown === undefined || !Number.isFinite(maxDrawdown)) return 45;
  return clampScore(100 - Math.abs(maxDrawdown) * 3);
}

function scoreVolatility(volatility: number | null | undefined) {
  if (volatility === null || volatility === undefined || !Number.isFinite(volatility)) return 45;
  return clampScore(100 - volatility * 2);
}

function scoreAum(aum: number | null | undefined) {
  if (aum === null || aum === undefined || !Number.isFinite(aum)) return 45;
  if (aum >= 50) return 85;
  if (aum >= 20) return 78;
  if (aum >= 10) return 68;
  return 52;
}

function scoreFee(feeRate: number | null | undefined) {
  if (feeRate === null || feeRate === undefined || !Number.isFinite(feeRate)) return 55;
  return clampScore(90 - feeRate * 55);
}

function scoreDataConfidence(input: CalculateFundScoreInput) {
  const missingPenalty = (input.fund.missingMetrics?.length ?? 0) * 8;
  const qualityPenalty =
    input.fund.dataCompleteness === "failed"
      ? 35
      : input.fund.dataCompleteness === "pending"
        ? 25
        : input.fund.dataCompleteness === "partial"
          ? 15
          : 0;
  const riskQualityPenalty =
    input.risk?.dataQuality === "stale"
      ? 25
      : input.risk?.dataQuality === "snapshot_only"
        ? 18
        : input.risk?.dataQuality === "partial"
          ? 10
          : 0;
  return clampScore(88 - missingPenalty - qualityPenalty - riskQualityPenalty);
}

function riskPenalty(risk?: StrategyRiskInput) {
  const levelPenalty = risk?.riskLevel === "high" ? 18 : risk?.riskLevel === "medium" ? 8 : 0;
  const vetoPenalty = (risk?.vetoes?.length ?? 0) * 12;
  const warningPenalty = (risk?.warnings?.length ?? 0) * 4;
  return levelPenalty + vetoPenalty + warningPenalty;
}

function deriveState(totalScore: number, components: FundScoreComponents, risk?: StrategyRiskInput): FundScoreState {
  if (risk?.vetoes?.length) return totalScore < 58 ? "avoid" : "hold";
  if (components.dataConfidence < 55) return "hold";
  if (totalScore >= 82 && components.riskAdjusted >= 65) return "staged_buy_candidate";
  if (totalScore >= 70) return "observe";
  if (totalScore >= 56) return "hold";
  return totalScore >= 45 ? "avoid" : "remove";
}

function confidenceFromData(score: number): StrategyConfidence {
  if (score >= 78) return "high";
  if (score >= 58) return "medium";
  return "low";
}

function nextActionForState(state: FundScoreState, risk?: StrategyRiskInput) {
  if (risk?.vetoes?.length) return "Keep under review until the active risk vetoes are cleared.";
  if (state === "staged_buy_candidate") return "Eligible for a system-generated staged-plan draft if the system conclusion remains ready.";
  if (state === "observe") return "Keep observing and wait for stronger confirmation.";
  if (state === "hold") return "Hold the strategy review; evidence is not strong enough yet.";
  if (state === "avoid") return "Do not enter staged planning under the current conditions.";
  return "Remove from the strategy pool unless new evidence appears.";
}

function plannedExposure(totalExposure: number, batchCount: number, batchIndex: number) {
  const base = Math.floor((totalExposure / batchCount) * 10) / 10;
  if (batchIndex < batchCount) return base;
  return Math.round((totalExposure - base * (batchCount - 1)) * 10) / 10;
}

function normalizeDate(dateValue: string | undefined, fallback = "1970-01-01") {
  if (!dateValue) return fallback;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return date.toISOString().slice(0, 10);
}

function addDays(dateValue: string | undefined, days: number) {
  const date = new Date(normalizeDate(dateValue));
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function industryScore(summary?: IndustryEventImpactSummary | null) {
  if (!summary) return null;
  const base =
    summary.impactDirection === "long_term_support"
      ? 82
      : summary.impactDirection === "mixed"
        ? 62
        : summary.impactDirection === "short_term_noise"
          ? 56
          : summary.impactDirection === "risk_or_invalidation"
            ? 36
            : 48;
  const confidenceAdjustment = summary.confidence === "high" ? 8 : summary.confidence === "low" ? -8 : 0;
  const eventAdjustment = summary.supportCount * 2 - summary.riskCount * 4;
  return clampScore(base + confidenceAdjustment + eventAdjustment);
}

function portfolioFitScore(context?: WatchlistStrategyPortfolioContext) {
  if (!context) return null;
  const penalties = [
    exposurePenalty(context.themeExposurePercent, context.maxThemeExposurePercent),
    exposurePenalty(context.fundExposurePercent, context.maxFundExposurePercent),
    exposurePenalty(context.qdiiExposurePercent, context.maxQdiiExposurePercent)
  ];
  return clampScore(86 - penalties.reduce((sum, value) => sum + value, 0));
}

function exposurePenalty(current?: number | null, limit?: number | null) {
  if (current === null || current === undefined || limit === null || limit === undefined || !Number.isFinite(current) || !Number.isFinite(limit) || limit <= 0) {
    return 0;
  }
  if (current <= limit * 0.7) return 0;
  if (current <= limit) return 8;
  return 24 + Math.min(24, (current - limit) * 2);
}

function fieldMissing(value: unknown) {
  return value === null || value === undefined || (typeof value === "number" && !Number.isFinite(value));
}

function buildMissingEvidence(input: GenerateWatchlistStrategyStateInput, riskAssessment: RiskAssessment): WatchlistStrategyMissingEvidence[] {
  const missingEvidence: WatchlistStrategyMissingEvidence[] = [];
  const metricFields: Array<keyof Pick<WatchlistStrategyFundInput, "return1m" | "return3m" | "return6m" | "maxDrawdown" | "volatility" | "aum" | "feeRate">> = [
    "return1m",
    "return3m",
    "return6m",
    "maxDrawdown",
    "volatility",
    "aum",
    "feeRate"
  ];

  if (riskAssessment.fundId !== input.fund.fundId || (riskAssessment.fundCode && input.fund.fundCode && riskAssessment.fundCode !== input.fund.fundCode)) {
    missingEvidence.push({
      code: "manual_needed",
      field: "riskAssessment.fundId",
      message: "Risk assessment identity does not match the current fund.",
      impact: "The generator cannot safely use this risk result for a system conclusion.",
      suggestedAction: "Refresh the risk assessment with the current fund id and code before generating a plan draft."
    });
  }

  metricFields.forEach((field) => {
    if (fieldMissing(input.fund[field])) {
      missingEvidence.push({
        code: input.fund.dataCompleteness === "failed" ? "fetch_failed" : "source_unavailable",
        field,
        message: `${field} is not available for this fund snapshot.`,
        impact: "Strategy score stays in scoring until the metric is refreshed or replaced by an accepted source.",
        suggestedAction: "Refresh the fund snapshot, connect an authorized source, or mark a suitable substitute metric.",
        source: input.fund.dataCompleteness ?? "unknown",
        updatedAt: input.fund.metricUpdatedAt ?? input.asOfDate
      });
    }
  });

  input.fund.missingMetrics?.forEach((metric) => {
    if (!missingEvidence.some((item) => item.field === metric)) {
      missingEvidence.push({
        code: "source_unavailable",
        field: metric,
        message: `${metric} is listed as missing in the fund data snapshot.`,
        impact: "The strategy state cannot become a plan draft until this evidence gap is resolved or marked not applicable.",
        suggestedAction: "Add the metric through an authorized data source or explain why it is not applicable.",
        source: input.fund.dataCompleteness ?? "unknown",
        updatedAt: input.fund.metricUpdatedAt ?? input.asOfDate
      });
    }
  });

  if (!input.industryEventSummary) {
    missingEvidence.push({
      code: "source_unavailable",
      field: "industryEventSummary",
      message: "No industry event summary is linked to this fund yet.",
      impact: "Industry thesis confidence remains limited.",
      suggestedAction: "Map the fund to an industry summary or wait for the industry event helper to refresh."
    });
  }

  if (!input.portfolioContext) {
    missingEvidence.push({
      code: "manual_needed",
      field: "portfolioContext",
      message: "No portfolio exposure context is available for concentration checks.",
      impact: "The state cannot confirm personal holding fit.",
      suggestedAction: "Add current holding cost, exposure, or portfolio limits in the portfolio module."
    });
  }

  if (riskAssessment.dataQuality === "stale" || riskAssessment.dataQuality === "snapshot_only") {
    missingEvidence.push({
      code: riskAssessment.dataQuality === "stale" ? "stale_data" : "manual_needed",
      field: "riskAssessment.dataQuality",
      message: `Risk assessment data quality is ${riskAssessment.dataQuality}.`,
      impact: "Risk freshness blocks staged-plan drafting.",
      suggestedAction: "Refresh key fund metrics before the next system conclusion.",
      updatedAt: input.fund.metricUpdatedAt ?? input.fund.metricTradeDate ?? input.asOfDate
    });
  }

  if (input.fund.fundType === "QDII" && fieldMissing(input.fund.return1m)) {
    missingEvidence.push({
      code: "not_applicable",
      field: "intradayValuation",
      message: "Intraday valuation may not be suitable for QDII funds because of delayed overseas market data.",
      impact: "Use dated NAV or delayed valuation evidence instead of treating the value as live pricing.",
      suggestedAction: "Show the valuation date and delay reason when QDII valuation data is used."
    });
  }

  missingEvidence.push({
    code: "source_unavailable",
    field: "portfolioValuationSnapshot",
    message: "No current portfolio valuation snapshot is linked to this strategy state yet.",
    impact: "The state cannot become a staged-plan draft until current valuation and estimated profit are available.",
    suggestedAction: "Connect the held-fund valuation snapshot once the portfolio valuation contract is implemented.",
    updatedAt: input.asOfDate
  });

  const aiSummary = summarizeAiEvidenceForStrategy(input.aiEvidence, input.fund.fundId, input.fund.fundCode);
  aiSummary.missingEvidence.forEach((item) => {
    if (!missingEvidence.some((existing) => existing.field === item.field)) {
      missingEvidence.push(item);
    }
  });
  if (aiSummary.hasUnresolvedConflict) {
    missingEvidence.push({
      code: "manual_needed",
      field: "aiEvidence.conflict",
      message: "AI evidence contains unresolved conflict for the current fund thesis.",
      impact: "The system conclusion remains blocked from staged-plan readiness until the conflict is reviewed.",
      suggestedAction: "Compare supporting and weakening evidence by source date before refreshing the system conclusion.",
      updatedAt: input.asOfDate
    });
  }

  return missingEvidence;
}

function validBacktestSummary(backtest?: WatchlistStrategyBacktestSummary | null) {
  if (
    !backtest?.sampleStartDate ||
    !backtest.sampleEndDate ||
    !backtest.benchmark.trim() ||
    !backtest.feeAssumption.trim() ||
    !backtest.conclusion.trim() ||
    !backtest.limitations.length ||
    typeof backtest.sampleSize !== "number" ||
    !Number.isFinite(backtest.sampleSize)
  ) {
    return false;
  }

  if (backtest.sampleSize <= 0) {
    return true;
  }

  return [backtest.returnPercent, backtest.maxDrawdownPercent].every((value) => typeof value === "number" && Number.isFinite(value));
}

function backtestNeedsCaution(backtest?: WatchlistStrategyBacktestSummary | null) {
  if (!validBacktestSummary(backtest)) return false;
  return backtest?.overfitRisk === "high" || (backtest?.sampleSize !== undefined && backtest.sampleSize !== null && backtest.sampleSize < 120);
}

function validManualAssumptions(assumptions?: WatchlistStrategyManualAssumptionRef[]) {
  return (assumptions ?? []).filter((assumption) => assumption.invalidationCondition.trim());
}

function applyManualAssumptionConfidence(
  confidence: StrategyConfidence,
  assumptions: WatchlistStrategyManualAssumptionRef[],
  riskAssessment: RiskAssessment
): StrategyConfidence {
  if (!assumptions.length || riskAssessment.vetoes.length || riskAssessment.riskLevel === "high") {
    return confidence;
  }
  if (confidence === "low" && assumptions.some((assumption) => assumption.confidence === "medium" || assumption.confidence === "high")) {
    return "medium";
  }
  return confidence;
}

function applyBacktestConfidence(confidence: StrategyConfidence, backtest?: WatchlistStrategyBacktestSummary | null): StrategyConfidence {
  if (!backtestNeedsCaution(backtest)) return confidence;
  if (confidence === "high") return "medium";
  return "low";
}

function applyAiEvidenceConfidence(confidence: StrategyConfidence, input: GenerateWatchlistStrategyStateInput, riskAssessment: RiskAssessment): StrategyConfidence {
  const aiSummary = summarizeAiEvidenceForStrategy(input.aiEvidence, input.fund.fundId, input.fund.fundCode);
  if (!aiSummary.evidenceRefs.length) return confidence;
  if (aiSummary.confidenceAdjustment < 0 || aiSummary.manualReviewRequired || riskAssessment.vetoes.length || riskAssessment.riskLevel === "high") {
    return confidence === "high" ? "medium" : "low";
  }
  if (aiSummary.confidenceAdjustment > 0 && confidence === "low") return "medium";
  return confidence;
}

function buildReason(fundScore: FundScore, riskAssessment: RiskAssessment, input: GenerateWatchlistStrategyStateInput) {
  const manualAssumptions = validManualAssumptions(input.manualAssumptions);
  const assumptionAdjustedConfidence = applyManualAssumptionConfidence(fundScore.confidence, manualAssumptions, riskAssessment);
  const aiAdjustedConfidence = applyAiEvidenceConfidence(assumptionAdjustedConfidence, input, riskAssessment);
  const effectiveConfidence = applyBacktestConfidence(aiAdjustedConfidence, input.backtestSummary);
  const aiSummary = summarizeAiEvidenceForStrategy(input.aiEvidence, input.fund.fundId, input.fund.fundCode);
  const parts = [
    `Strategy score ${fundScore.totalScore} with ${effectiveConfidence} confidence.`,
    fundScore.reasons[0],
    input.industryEventSummary ? `Industry evidence is ${input.industryEventSummary.impactDirection}.` : "Industry evidence is not complete.",
    riskAssessment.vetoes.length ? `Risk vetoes are active: ${riskAssessment.vetoes.join("; ")}.` : "No hard risk veto is active."
  ].filter(Boolean);

  if (manualAssumptions.length) {
    parts.push(`${manualAssumptions.length} user hypothesis note(s) with invalidation conditions are referenced as personal research assumptions only.`);
    if (effectiveConfidence !== fundScore.confidence) {
      parts.push("User hypothesis notes can raise explanation confidence one level but do not change risk vetoes or data requirements.");
    }
  }

  if (validBacktestSummary(input.backtestSummary)) {
    parts.push(
      `Backtest is included only as historical validation with disclosed limitations; sample size ${input.backtestSummary?.sampleSize ?? "unknown"}, overfit risk ${input.backtestSummary?.overfitRisk ?? "unknown"}.`
    );
    if (assumptionAdjustedConfidence !== effectiveConfidence) {
      parts.push("Backtest sample or overfitting caution lowers explanation confidence and cannot bypass risk vetoes.");
    }
  }

  if (aiSummary.evidenceRefs.length) {
    parts.push(
      `AI evidence contributes ${aiSummary.evidenceRefs.length} structured item(s) as evidence only; it cannot create plan readiness or bypass risk vetoes.`
    );
    if (aiSummary.thesisEffectSummary[0]) {
      parts.push(`AI thesis effect: ${aiSummary.thesisEffectSummary[0]}`);
    }
    if (aiSummary.manualReviewRequired) {
      parts.push("AI evidence requires review because risk, missing, stale, low-confidence, or conflicting signals are present.");
    }
  }

  return parts.join(" ");
}

function scoringNextAction(missingEvidence: WatchlistStrategyMissingEvidence[]) {
  const first = missingEvidence[0];
  if (!first) return "Continue observing until the next system strategy refresh.";
  return `${first.suggestedAction} Current state remains scoring until required evidence is complete.`;
}

function buildBaseState(input: GenerateWatchlistStrategyStateInput, riskAssessment: RiskAssessment, fundScore: FundScore): WatchlistStrategyState {
  const manualAssumptions = validManualAssumptions(input.manualAssumptions);
  const assumptionAdjustedConfidence = applyManualAssumptionConfidence(fundScore.confidence, manualAssumptions, riskAssessment);
  const aiSummary = summarizeAiEvidenceForStrategy(input.aiEvidence, input.fund.fundId, input.fund.fundCode);
  return {
    stage: "watching",
    strategyScore: fundScore.totalScore,
    riskLevel: riskAssessment.riskLevel,
    riskVetoes: riskAssessment.vetoes,
    nextReviewDate: riskAssessment.nextReviewDate ?? addDays(input.asOfDate, 14),
    reason: buildReason(fundScore, riskAssessment, input),
    confidence: applyBacktestConfidence(applyAiEvidenceConfidence(assumptionAdjustedConfidence, input, riskAssessment), input.backtestSummary),
    manualAssumptionRefs: manualAssumptions.length ? manualAssumptions : undefined,
    backtestSummary: validBacktestSummary(input.backtestSummary) ? input.backtestSummary ?? undefined : undefined,
    aiEvidenceRefs: aiSummary.evidenceRefs.length ? aiSummary.evidenceRefs : undefined,
    updatedAt: input.asOfDate ?? new Date().toISOString().slice(0, 10)
  };
}

export function generateWatchlistStrategyState(input: GenerateWatchlistStrategyStateInput): WatchlistStrategyState {
  const riskAssessment =
    input.riskAssessment ??
    evaluateFundRisk({
      fund: input.fund,
      portfolioContext: input.portfolioContext,
      aiEvidence: input.aiEvidence,
      asOfDate: input.asOfDate
    });
  const calculatedIndustryScore = industryScore(input.industryEventSummary);
  const calculatedPortfolioFitScore = portfolioFitScore(input.portfolioContext);
  const fundScore = calculateFundScore({
    fund: input.fund,
    industryOpportunityScore: calculatedIndustryScore ?? undefined,
    portfolioFitScore: calculatedPortfolioFitScore ?? undefined,
    risk: {
      riskLevel: riskAssessment.riskLevel,
      vetoes: riskAssessment.vetoes,
      warnings: riskAssessment.warnings,
      dataQuality: riskAssessment.dataQuality
    },
    scoreDate: input.asOfDate
  });
  const missingEvidence = buildMissingEvidence(input, riskAssessment);
  const baseState = buildBaseState(input, riskAssessment, fundScore);

  function withSystemConclusion(state: WatchlistStrategyState): WatchlistStrategyState {
    return {
      ...state,
      systemConclusion: buildSystemStrategyConclusion({
        fundScore,
        riskAssessment,
        strategyState: state,
        portfolioConcentrationSummary: input.portfolioContext
          ? `Theme exposure ${input.portfolioContext.themeExposurePercent ?? "unknown"}%; fund exposure ${input.portfolioContext.fundExposurePercent ?? "unknown"}%.`
          : "Portfolio concentration context is not available.",
        planLimitSummary: input.portfolioContext
          ? `Draft exposure must stay within fund limit ${input.portfolioContext.maxFundExposurePercent ?? "unknown"}% and theme limit ${input.portfolioContext.maxThemeExposurePercent ?? "unknown"}%.`
          : "Staged-plan limit context is not available.",
        asOfDate: input.asOfDate
      })
    };
  }

  if (input.explicitInvalidation) {
    return withSystemConclusion({
      ...baseState,
      stage: "removed",
      systemConclusionResult: "system_risk_blocked",
      nextAction: "Archive this watch item unless new evidence directly resolves the invalidation.",
      reason: `${baseState.reason} Explicit invalidation: ${input.explicitInvalidation.reason}. ${WATCHLIST_STATE_METHOD_VERSION}.`
    });
  }

  if (riskAssessment.vetoes.length || riskAssessment.riskLevel === "high") {
    return withSystemConclusion({
      ...baseState,
      stage: "paused",
      systemConclusionResult: "system_risk_blocked",
      nextAction: "Pause staged-plan drafting until risk vetoes clear and the system conclusion refreshes.",
      reason: `${baseState.reason} Risk veto prevents plan drafting. ${WATCHLIST_STATE_METHOD_VERSION}.`
    });
  }

  if (missingEvidence.length || fundScore.components.dataConfidence < 60) {
    return withSystemConclusion({
      ...baseState,
      stage: "scoring",
      systemConclusionResult: "system_need_more_evidence",
      missingEvidence,
      nextAction: scoringNextAction(missingEvidence),
      reason: `${baseState.reason} Required evidence is incomplete. ${WATCHLIST_STATE_METHOD_VERSION}.`
    });
  }

  if (fundScore.state === "staged_buy_candidate" && fundScore.totalScore >= 80 && fundScore.components.riskAdjusted >= 65) {
    return withSystemConclusion({
      ...baseState,
      stage: "buy_plan_draft",
      systemConclusionResult: "system_plan_draft_ready",
      buyPlanDraftId: input.buyPlanDraftId ?? `buy-plan-draft-${input.fund.fundId}-${normalizeDate(input.asOfDate, fundScore.scoreDate)}`,
      nextAction: "System conclusion can create a staged-buy plan draft record; no trade execution is implied.",
      reason: `${baseState.reason} Evidence and risk checks support a system plan draft. ${WATCHLIST_STATE_METHOD_VERSION}.`
    });
  }

  if (fundScore.state === "avoid" || fundScore.state === "remove") {
    return withSystemConclusion({
      ...baseState,
      stage: "paused",
      systemConclusionResult: "system_watch_continue",
      nextAction: "Do not create a plan draft under the current strategy evidence; keep watching only if there is a clear research reason.",
      reason: `${baseState.reason} Strategy score does not support plan drafting. ${WATCHLIST_STATE_METHOD_VERSION}.`
    });
  }

  return withSystemConclusion({
    ...baseState,
    stage: "watching",
    systemConclusionResult: "system_watch_continue",
    nextAction: fundScore.nextAction,
    reason: `${baseState.reason} Continue ordinary watchlist tracking. ${WATCHLIST_STATE_METHOD_VERSION}.`
  });
}

export function generateWatchlistStrategyStateMap(inputs: GenerateWatchlistStrategyStateInput[]) {
  return inputs.reduce<Record<string, WatchlistStrategyState>>((stateMap, input) => {
    const state = generateWatchlistStrategyState(input);
    const aliases = [input.fund.fundId, input.fund.fundCode, input.fund.fundCode ? `fund:${input.fund.fundCode}` : null, input.fund.fundCode ? `code-${input.fund.fundCode}` : null, input.fund.fundCode ? `user-${input.fund.fundCode}` : null].filter(Boolean) as string[];
    aliases.forEach((alias) => {
      stateMap[alias] = state;
    });
    return stateMap;
  }, {});
}

function buyPlanBlockedReasons(fundScore: FundScore, riskAssessment: RiskAssessment) {
  const reasons: string[] = [];

  if (riskAssessment.fundId !== fundScore.fundId || (riskAssessment.fundCode && fundScore.fundCode && riskAssessment.fundCode !== fundScore.fundCode)) {
    reasons.push("Fund score and risk assessment do not describe the same fund.");
  }
  if (fundScore.state !== "staged_buy_candidate") {
    reasons.push("Fund score state is not eligible for a staged-plan draft.");
  }
  if (fundScore.totalScore < 80) {
    reasons.push("Fund score is below the staged-plan draft threshold.");
  }
  if (fundScore.components.riskAdjusted < 65) {
    reasons.push("Risk-adjusted score is below the staged-plan draft threshold.");
  }
  if (fundScore.confidence === "low" || fundScore.components.dataConfidence < 60) {
    reasons.push("Data confidence is not sufficient for staged-plan drafting.");
  }
  if (fundScore.riskVetoes.length || riskAssessment.vetoes.length) {
    reasons.push("Active risk vetoes block staged-plan drafting.");
  }
  if (riskAssessment.riskLevel === "high") {
    reasons.push("High risk level requires pause instead of a staged-plan draft.");
  }
  if (riskAssessment.dataQuality === "snapshot_only" || riskAssessment.dataQuality === "stale") {
    reasons.push("Data quality is not fresh enough for staged-plan drafting.");
  }

  return reasons;
}

export function generateBuyPlanDraft(input: GenerateBuyPlanDraftInput): GenerateBuyPlanDraftResult {
  const { fundScore, riskAssessment } = input;
  const blockedReasons = buyPlanBlockedReasons(fundScore, riskAssessment);

  if (blockedReasons.length) {
    return {
      plan: null,
      blockedReasons
    };
  }

  const batchCount = Math.max(2, Math.min(5, Math.round(input.batchCount ?? 3)));
  const maxPlannedExposurePercent = Math.max(1, Math.min(12, Math.round((input.maxExposurePercent ?? 8) * 10) / 10));
  const createdAt = normalizeDate(input.createdAt ?? fundScore.scoreDate, fundScore.scoreDate);
  const pauseConditions = Array.from(
    new Set([
      ...riskAssessment.pauseConditions,
      "Pause if the fund score falls below the staged-plan draft threshold.",
      "Pause if new evidence weakens the original observation thesis."
    ])
  );
  const invalidationConditions = Array.from(
    new Set([
      ...riskAssessment.invalidationConditions,
      "Invalidate if a risk veto appears before the next system conclusion refresh.",
      "Invalidate if data confidence drops below the minimum review threshold."
    ])
  );

  const batches = Array.from({ length: batchCount }, (_, index) => {
    const batchIndex = index + 1;
    const trigger =
      batchIndex === 1
        ? "System conclusion remains ready and no risk veto is active before recording this draft batch."
        : batchIndex === batchCount
          ? "Post-buy review evidence remains valid and no risk veto is active before considering the final draft batch."
          : "Industry trend, fund metrics, and portfolio concentration remain within the system conclusion conditions.";

    return {
      batchIndex,
      trigger,
      plannedExposurePercent: plannedExposure(maxPlannedExposurePercent, batchCount, batchIndex),
      status: batchIndex === 1 ? ("ready_for_system_plan" as const) : ("pending" as const)
    };
  });

  return {
    plan: {
      planId: `buy-plan-draft-${fundScore.fundId}-${createdAt}`,
      fundId: fundScore.fundId,
      fundCode: fundScore.fundCode,
      fundName: fundScore.fundName,
      createdAt,
      status: "draft",
      maxPlannedExposurePercent,
      batchCount,
      batches,
      pauseConditions,
      invalidationConditions,
      reviewDate: riskAssessment.nextReviewDate ?? addDays(createdAt, 14),
      notes: `${BUY_PLAN_METHOD_VERSION}; system-generated draft and user record only. It does not execute orders or imply an unconditional buy.`
    },
    blockedReasons: []
  };
}

export function calculateFundScore(input: CalculateFundScoreInput): FundScore {
  const returnScore = clampScore(
    scorePositiveReturn(input.fund.return1m) * 0.25 +
      scorePositiveReturn(input.fund.return3m) * 0.45 +
      scorePositiveReturn(input.fund.return6m) * 0.3
  );
  const drawdownScore = scoreDrawdown(input.fund.maxDrawdown);
  const volatilityScore = scoreVolatility(input.fund.volatility);
  const fundQuality = clampScore(returnScore * 0.42 + scoreAum(input.fund.aum) * 0.28 + scoreFee(input.fund.feeRate) * 0.3);
  const riskAdjusted = clampScore(drawdownScore * 0.45 + volatilityScore * 0.35 + fundQuality * 0.2 - riskPenalty(input.risk));
  const dataConfidence = scoreDataConfidence(input);
  const components: FundScoreComponents = {
    industryOpportunity: clampScore(input.industryOpportunityScore ?? 50),
    fundQuality,
    timing: returnScore,
    riskAdjusted,
    dataConfidence,
    portfolioFit: clampScore(input.portfolioFitScore ?? 60)
  };
  const totalScore = clampScore(
    components.industryOpportunity * 0.2 +
      components.fundQuality * 0.22 +
      components.timing * 0.16 +
      components.riskAdjusted * 0.2 +
      components.dataConfidence * 0.1 +
      components.portfolioFit * 0.12
  );
  const state = deriveState(totalScore, components, input.risk);

  return {
    fundId: input.fund.fundId,
    fundCode: input.fund.fundCode,
    fundName: input.fund.fundName,
    scoreDate: input.scoreDate ?? new Date().toISOString().slice(0, 10),
    totalScore,
    state,
    components,
    reasons: [
      `Industry opportunity score: ${components.industryOpportunity}.`,
      `Fund quality score: ${components.fundQuality}.`,
      `Portfolio fit score: ${components.portfolioFit}.`
    ],
    weaknesses: [
      ...(components.riskAdjusted < 60 ? ["Risk-adjusted score is below the preferred review threshold."] : []),
      ...(components.dataConfidence < 65 ? ["Data confidence is limited and needs review before planning."] : [])
    ],
    riskVetoes: input.risk?.vetoes ?? [],
    confidence: confidenceFromData(components.dataConfidence),
    nextAction: nextActionForState(state, input.risk),
    methodology: `${METHOD_VERSION}; rule-based demo helper for personal review workflows only.`
  };
}
