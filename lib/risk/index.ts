import { AiEvidenceItem, FundListItem, RiskAssessment, RiskAssessmentLevel, RiskDataQuality } from "@/types";
import { summarizeAiEvidenceForStrategy } from "@/lib/strategy/ai-evidence";

export type EvaluateFundRiskInput = {
  fund: Pick<FundListItem, "fundId" | "fundName" | "fundType" | "theme"> &
    Partial<Pick<FundListItem, "fundCode" | "maxDrawdown" | "volatility" | "aum" | "dataCompleteness" | "missingMetrics" | "metricTradeDate" | "metricUpdatedAt">>;
  portfolioContext?: {
    themeExposurePercent?: number | null;
    fundExposurePercent?: number | null;
    qdiiExposurePercent?: number | null;
    maxThemeExposurePercent?: number | null;
    maxFundExposurePercent?: number | null;
    maxQdiiExposurePercent?: number | null;
  };
  aiEvidence?: AiEvidenceItem[];
  asOfDate?: string;
};

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function daysBetween(fromTime: number, toTime: number) {
  return Math.floor(Math.abs(toTime - fromTime) / 86_400_000);
}

function riskDataQuality(input: EvaluateFundRiskInput, warnings: string[]): RiskDataQuality {
  if (input.fund.dataCompleteness === "failed") return "stale";
  if (input.fund.dataCompleteness === "pending") return "snapshot_only";
  if (input.fund.dataCompleteness === "partial" || input.fund.missingMetrics?.length) return "partial";

  const asOf = parseDate(input.asOfDate) ?? Date.now();
  const metricTime = parseDate(input.fund.metricTradeDate) ?? parseDate(input.fund.metricUpdatedAt);
  if (metricTime && daysBetween(metricTime, asOf) > 14) {
    warnings.push("Fund metrics may be stale and should be refreshed before strategy planning.");
    return "stale";
  }

  return "complete";
}

function addConcentrationChecks(input: EvaluateFundRiskInput, vetoes: string[], warnings: string[]) {
  const context = input.portfolioContext;
  if (!context) return;

  if (
    context.maxFundExposurePercent !== null &&
    context.maxFundExposurePercent !== undefined &&
    context.fundExposurePercent !== null &&
    context.fundExposurePercent !== undefined &&
    context.fundExposurePercent > context.maxFundExposurePercent
  ) {
    vetoes.push("Single-fund exposure is above the personal limit.");
  }

  if (
    context.maxThemeExposurePercent !== null &&
    context.maxThemeExposurePercent !== undefined &&
    context.themeExposurePercent !== null &&
    context.themeExposurePercent !== undefined &&
    context.themeExposurePercent > context.maxThemeExposurePercent
  ) {
    vetoes.push("Theme exposure is above the personal limit.");
  }

  if (
    input.fund.fundType === "QDII" &&
    context.maxQdiiExposurePercent !== null &&
    context.maxQdiiExposurePercent !== undefined &&
    context.qdiiExposurePercent !== null &&
    context.qdiiExposurePercent !== undefined &&
    context.qdiiExposurePercent > context.maxQdiiExposurePercent
  ) {
    vetoes.push("QDII exposure is above the personal limit.");
  }

  if ((context.themeExposurePercent ?? 0) > 0) {
    warnings.push(`Existing theme exposure for ${input.fund.theme} should be reviewed before adding more.`);
  }
}

function hasMetric(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function deriveRiskLevel(vetoes: string[], warnings: string[], fund: EvaluateFundRiskInput["fund"]): RiskAssessmentLevel {
  if (vetoes.length) return "high";
  if ((hasMetric(fund.volatility) && fund.volatility >= 32) || (hasMetric(fund.maxDrawdown) && Math.abs(fund.maxDrawdown) >= 18)) return "high";
  if (warnings.length || (hasMetric(fund.volatility) && fund.volatility >= 24) || (hasMetric(fund.maxDrawdown) && Math.abs(fund.maxDrawdown) >= 12)) return "medium";
  return "low";
}

function nextReviewDate(asOfDate?: string) {
  const date = parseDate(asOfDate) ? new Date(asOfDate as string) : new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

export function evaluateFundRisk(input: EvaluateFundRiskInput): RiskAssessment {
  const vetoes: string[] = [];
  const warnings: string[] = [];

  const missingRiskMetrics = ["volatility", "maxDrawdown"].filter((metric) => input.fund.missingMetrics?.includes(metric));
  if (!hasMetric(input.fund.volatility) || !hasMetric(input.fund.maxDrawdown) || missingRiskMetrics.length) {
    warnings.push("Risk metrics are incomplete; missing values are not treated as low risk.");
  }

  if (hasMetric(input.fund.volatility) && input.fund.volatility >= 34) {
    vetoes.push("Volatility is above the staged-plan threshold.");
  } else if (hasMetric(input.fund.volatility) && input.fund.volatility >= 26) {
    warnings.push("Volatility is elevated and needs position-size control.");
  }

  if (hasMetric(input.fund.maxDrawdown) && Math.abs(input.fund.maxDrawdown) >= 20) {
    vetoes.push("Maximum drawdown is above the staged-plan threshold.");
  } else if (hasMetric(input.fund.maxDrawdown) && Math.abs(input.fund.maxDrawdown) >= 14) {
    warnings.push("Maximum drawdown is elevated and needs review.");
  }

  if (hasMetric(input.fund.aum) && input.fund.aum > 0 && input.fund.aum < 8) {
    warnings.push("Fund size is small and liquidity or stability should be reviewed.");
  }

  const dataQuality = riskDataQuality(input, warnings);
  if (dataQuality === "stale" || dataQuality === "snapshot_only") {
    vetoes.push("Data quality is not sufficient for staged-plan planning.");
  }

  addConcentrationChecks(input, vetoes, warnings);

  const aiSummary = summarizeAiEvidenceForStrategy(input.aiEvidence, input.fund.fundId, input.fund.fundCode);
  aiSummary.riskWarnings.forEach((warning) => warnings.push(`AI evidence risk signal: ${warning}`));
  aiSummary.riskVetoes.forEach((veto) => vetoes.push(`AI evidence risk veto candidate: ${veto}`));
  if (aiSummary.hasUnresolvedConflict) {
    warnings.push("AI evidence is conflicting and requires system evidence review before staged planning.");
  }
  if (aiSummary.manualReviewRequired && !aiSummary.riskVetoes.length) {
    warnings.push("AI evidence requires review before it can support a system conclusion.");
  }

  return {
    fundId: input.fund.fundId,
    fundCode: input.fund.fundCode,
    fundName: input.fund.fundName,
    riskLevel: deriveRiskLevel(vetoes, warnings, input.fund),
    vetoes,
    warnings,
    pauseConditions: [
      "Pause if volatility or drawdown rises above the review threshold.",
      "Pause if portfolio concentration exceeds the configured personal limit.",
      "Pause if key fund metrics become stale or incomplete.",
      ...(aiSummary.manualReviewRequired ? ["Pause if AI evidence is unresolved, stale, low-confidence, or conflicting."] : [])
    ],
    invalidationConditions: [
      "Invalidate the plan if the original industry or fund thesis is no longer supported.",
      "Invalidate the plan if a risk veto remains active after review.",
      "Invalidate the plan if the fund style meaningfully drifts from the observation reason.",
      ...aiSummary.invalidationSignals.map((signal) => `Invalidate if AI evidence is confirmed: ${signal}`)
    ],
    dataQuality,
    nextReviewDate: nextReviewDate(input.asOfDate)
  };
}
