import { FundScore, RiskAssessment, SystemStrategyConclusion, WatchlistStrategyState } from "@/types";

export type BuildSystemStrategyConclusionInput = {
  fundScore: FundScore;
  riskAssessment: RiskAssessment;
  riskAssessmentId?: string;
  strategyState: Pick<WatchlistStrategyState, "stage" | "systemConclusionResult" | "reason" | "buyPlanDraftId" | "aiEvidenceRefs" | "missingEvidence" | "backtestSummary">;
  valuation?: {
    valuationId?: string;
    estimatedValue?: number | null;
    estimatedProfit?: number | null;
    valuationUpdatedAt?: string;
    valuationStatus?: SystemStrategyConclusion["valuationStatus"];
  };
  portfolioConcentrationSummary?: string;
  planLimitSummary?: string;
  asOfDate?: string;
};

function asDate(value?: string) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().slice(0, 10);
}

function asTimestamp(value?: string) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function hasFiniteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value);
}

export function buildSystemStrategyConclusion(input: BuildSystemStrategyConclusionInput): SystemStrategyConclusion {
  const conclusionResult =
    input.strategyState.systemConclusionResult ??
    (input.riskAssessment.vetoes.length
      ? "system_risk_blocked"
      : input.strategyState.missingEvidence?.length
        ? "system_need_more_evidence"
        : input.strategyState.stage === "buy_plan_draft"
          ? "system_plan_draft_ready"
          : "system_watch_continue");
  const aiEvidenceIds = input.strategyState.aiEvidenceRefs?.map((item) => item.evidenceId) ?? [];
  const requiresPlanReadyEvidence = conclusionResult === "system_plan_draft_ready";
  const valuationLinked = Boolean(input.valuation?.valuationId || input.valuation?.valuationStatus || input.valuation?.valuationUpdatedAt);
  const valuationFreshEnough = input.valuation?.valuationStatus === "fresh" || input.valuation?.valuationStatus === "delayed";
  const estimatedProfitAvailable = hasFiniteNumber(input.valuation?.estimatedProfit);
  const concentrationSummary = input.portfolioConcentrationSummary ?? "";
  const concentrationSummaryAvailable = Boolean(concentrationSummary) && !concentrationSummary.toLowerCase().includes("not available");
  const planLimitSummaryAvailable = Boolean(input.planLimitSummary);
  const pauseConditionsAvailable = input.riskAssessment.pauseConditions.length > 0;
  const invalidationConditionsAvailable = input.riskAssessment.invalidationConditions.length > 0;
  const ruleChecks = [
    {
      ruleId: "strategy-score",
      label: "Strategy score threshold",
      passed: input.fundScore.totalScore >= 80,
      message: `Strategy score is ${input.fundScore.totalScore}.`
    },
    {
      ruleId: "risk-veto",
      label: "Risk veto check",
      passed: input.riskAssessment.vetoes.length === 0 && input.riskAssessment.riskLevel !== "high",
      message: input.riskAssessment.vetoes.length ? input.riskAssessment.vetoes.join("; ") : "No hard risk veto is active."
    },
    {
      ruleId: "data-quality",
      label: "Data quality check",
      passed: input.riskAssessment.dataQuality === "complete" || input.riskAssessment.dataQuality === "partial",
      message: `Risk data quality is ${input.riskAssessment.dataQuality}.`
    },
    {
      ruleId: "missing-evidence",
      label: "Missing evidence check",
      passed: !(input.strategyState.missingEvidence?.length),
      message: input.strategyState.missingEvidence?.length ? `${input.strategyState.missingEvidence.length} evidence gap(s) remain.` : "Required evidence is complete enough for the current state."
    },
    {
      ruleId: "ai-evidence",
      label: "AI evidence review",
      passed: !(input.strategyState.aiEvidenceRefs ?? []).some((item) => item.requiresSystemEvidenceReview || item.evidenceStatus !== "interpreted"),
      message: aiEvidenceIds.length ? `${aiEvidenceIds.length} structured AI evidence item(s) referenced.` : "No AI evidence is required for this conclusion."
    },
    {
      ruleId: "valuation-freshness",
      label: "Current valuation freshness",
      passed: valuationLinked ? valuationFreshEnough : !requiresPlanReadyEvidence,
      message: valuationLinked
        ? `Valuation status is ${input.valuation?.valuationStatus}; updated at ${input.valuation?.valuationUpdatedAt ?? "unknown"}.`
        : "No portfolio valuation snapshot is linked; it is required before plan-draft readiness."
    },
    {
      ruleId: "estimated-profit",
      label: "Estimated profit availability",
      passed: estimatedProfitAvailable || !requiresPlanReadyEvidence,
      message: estimatedProfitAvailable
        ? `Estimated profit is ${input.valuation?.estimatedProfit}.`
        : "Estimated profit is unavailable; do not display it as zero."
    },
    {
      ruleId: "portfolio-concentration",
      label: "Portfolio concentration check",
      passed: concentrationSummaryAvailable || !requiresPlanReadyEvidence,
      message: input.portfolioConcentrationSummary ?? "Portfolio concentration context is not available."
    },
    {
      ruleId: "plan-limit",
      label: "Plan limit check",
      passed: planLimitSummaryAvailable || !requiresPlanReadyEvidence,
      message: input.planLimitSummary ?? "No staged-plan limit summary is linked yet."
    },
    {
      ruleId: "pause-conditions",
      label: "Pause conditions check",
      passed: pauseConditionsAvailable,
      message: pauseConditionsAvailable
        ? `${input.riskAssessment.pauseConditions.length} pause condition(s) recorded.`
        : "No pause condition is recorded for this conclusion."
    },
    {
      ruleId: "invalidation-conditions",
      label: "Invalidation conditions check",
      passed: invalidationConditionsAvailable,
      message: invalidationConditionsAvailable
        ? `${input.riskAssessment.invalidationConditions.length} invalidation condition(s) recorded.`
        : "No invalidation condition is recorded for this conclusion."
    }
  ];

  return {
    conclusionId: `system-conclusion-${input.fundScore.fundId}-${asDate(input.asOfDate ?? input.fundScore.scoreDate)}`,
    fundId: input.fundScore.fundId,
    fundCode: input.fundScore.fundCode,
    fundName: input.fundScore.fundName,
    relatedAiEvidenceIds: aiEvidenceIds,
    relatedRiskAssessmentId: input.riskAssessmentId,
    relatedPortfolioValuationId: input.valuation?.valuationId,
    relatedBuyPlanDraftId: input.strategyState.buyPlanDraftId,
    conclusionTime: asTimestamp(input.asOfDate ?? input.fundScore.scoreDate),
    conclusionResult,
    recommendationReason: input.strategyState.reason ?? input.fundScore.reasons[0] ?? "System strategy conclusion generated from current evidence.",
    coreEvidence: [
      ...input.fundScore.reasons,
      ...(input.strategyState.backtestSummary ? [input.strategyState.backtestSummary.conclusion] : []),
      ...(input.strategyState.aiEvidenceRefs?.map((item) => item.displaySummary).slice(0, 3) ?? [])
    ],
    triggeredRules: ruleChecks,
    riskVetoes: input.riskAssessment.vetoes,
    dataQuality: input.riskAssessment.dataQuality,
    valuationStatus: input.valuation?.valuationStatus,
    estimatedValue: input.valuation?.estimatedValue,
    estimatedProfit: input.valuation?.estimatedProfit,
    valuationUpdatedAt: input.valuation?.valuationUpdatedAt,
    portfolioConcentrationSummary: input.portfolioConcentrationSummary,
    planLimitSummary: input.planLimitSummary,
    pauseConditions: input.riskAssessment.pauseConditions,
    invalidationConditions: input.riskAssessment.invalidationConditions,
    dataSnapshotSummary: `Score ${input.fundScore.totalScore}; risk ${input.riskAssessment.riskLevel}; data ${input.riskAssessment.dataQuality}; state ${input.strategyState.stage}.`,
    nextSystemReviewDate: input.riskAssessment.nextReviewDate,
    note: "System strategy conclusion is a personal research record only. It does not execute trades."
  };
}
