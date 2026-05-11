import { AiEvidenceItem, WatchlistStrategyMissingEvidence } from "@/types";

export type AiEvidenceStrategySummary = {
  evidenceRefs: AiEvidenceItem[];
  confidenceAdjustment: -1 | 0 | 1;
  thesisEffectSummary: string[];
  riskWarnings: string[];
  riskVetoes: string[];
  invalidationSignals: string[];
  missingEvidence: WatchlistStrategyMissingEvidence[];
  manualReviewRequired: boolean;
  hasUnresolvedConflict: boolean;
};

function appliesToFund(item: AiEvidenceItem, fundId: string, fundCode?: string) {
  return item.relatedFundIds.includes(fundId) || Boolean(fundCode && item.relatedFundCodes?.includes(fundCode));
}

function missingEvidenceFor(item: AiEvidenceItem): WatchlistStrategyMissingEvidence | null {
  const statusMap: Partial<Record<AiEvidenceItem["evidenceStatus"], WatchlistStrategyMissingEvidence["code"]>> = {
    ai_pending_review: "manual_needed",
    ai_interpretation_failed: "fetch_failed",
    source_unavailable: "source_unavailable",
    stale_source: "stale_data",
    low_confidence: "manual_needed"
  };
  const code = statusMap[item.evidenceStatus];
  if (!code) return null;

  return {
    code,
    field: `aiEvidence.${item.evidenceId}`,
    message: item.displaySummary,
    impact: "AI evidence cannot support a plan draft until the source and interpretation are reviewed.",
    suggestedAction: "Review the source document, refresh the evidence, or wait for a higher-confidence structured interpretation.",
    source: item.sourceName,
    updatedAt: item.generatedAt ?? item.ingestedAt
  };
}

export function summarizeAiEvidenceForStrategy(items: AiEvidenceItem[] | undefined, fundId: string, fundCode?: string): AiEvidenceStrategySummary {
  const relevant = (items ?? []).filter((item) => appliesToFund(item, fundId, fundCode));
  const missingEvidence = relevant.map(missingEvidenceFor).filter((item): item is WatchlistStrategyMissingEvidence => Boolean(item));
  const highSeveritySignals = relevant.flatMap((item) => item.riskSignals.filter((signal) => signal.severity === "high").map((signal) => signal.message));
  const riskWarnings = relevant.flatMap((item) =>
    item.riskSignals
      .filter((signal) => signal.severity !== "high")
      .map((signal) => signal.message)
  );
  const invalidationSignals = relevant
    .filter((item) => item.impactDirection === "invalidation")
    .map((item) => item.thesisEffect);
  const hasUnresolvedConflict = relevant.some((item) => item.conflictStatus === "unresolved_conflict" || item.conflictStatus === "conflicts_with_existing_thesis");
  const manualReviewRequired =
    relevant.some((item) => item.requiresSystemEvidenceReview) ||
    hasUnresolvedConflict ||
    missingEvidence.length > 0 ||
    highSeveritySignals.length > 0 ||
    invalidationSignals.length > 0;
  const positiveSupport = relevant.filter(
    (item) => item.impactDirection === "support" && item.confidence !== "low" && item.sourceFreshness !== "stale" && item.evidenceStatus === "interpreted"
  ).length;
  const negativePressure = relevant.filter(
    (item) =>
      item.impactDirection === "risk" ||
      item.impactDirection === "invalidation" ||
      item.impactDirection === "mixed" ||
      item.impactDirection === "insufficient_evidence" ||
      item.evidenceStatus !== "interpreted" ||
      item.sourceFreshness === "stale"
  ).length;

  return {
    evidenceRefs: relevant,
    confidenceAdjustment: negativePressure > 0 || hasUnresolvedConflict ? -1 : positiveSupport > 0 ? 1 : 0,
    thesisEffectSummary: relevant.map((item) => item.thesisEffect).filter(Boolean).slice(0, 4),
    riskWarnings: Array.from(new Set(riskWarnings)),
    riskVetoes: Array.from(new Set([...highSeveritySignals, ...invalidationSignals])),
    invalidationSignals: Array.from(new Set(invalidationSignals)),
    missingEvidence,
    manualReviewRequired,
    hasUnresolvedConflict
  };
}
