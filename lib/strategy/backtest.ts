import { BuildWatchlistStrategyBacktestSummaryInput, WatchlistStrategyBacktestSeriesPoint, WatchlistStrategyBacktestSummary } from "@/types";

const METHOD_VERSION = "watchlist-backtest-summary-v1";
const DEFAULT_MIN_SAMPLE_SIZE = 120;
const DEFAULT_PERIODS_PER_YEAR = 252;

type NormalizedPoint = {
  date: string;
  returnDecimal: number;
};

function roundPercent(value: number) {
  return Math.round(value * 1000) / 10;
}

function normalizeDate(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function validNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeSeries(series: WatchlistStrategyBacktestSeriesPoint[]): NormalizedPoint[] {
  const sorted = series
    .map((point) => ({ ...point, normalizedDate: normalizeDate(point.date) }))
    .filter((point): point is WatchlistStrategyBacktestSeriesPoint & { normalizedDate: string } => Boolean(point.normalizedDate))
    .sort((a, b) => a.normalizedDate.localeCompare(b.normalizedDate));

  return sorted.reduce<NormalizedPoint[]>((points, point, index) => {
    if (validNumber(point.returnPercent)) {
      points.push({
        date: point.normalizedDate,
        returnDecimal: point.returnPercent / 100
      });
      return points;
    }

    const previousPoint = sorted[index - 1];
    if (validNumber(point.nav) && validNumber(previousPoint?.nav) && previousPoint.nav > 0) {
      points.push({
        date: point.normalizedDate,
        returnDecimal: point.nav / previousPoint.nav - 1
      });
    }

    return points;
  }, []);
}

function compoundReturn(points: NormalizedPoint[]) {
  return points.reduce((value, point) => value * (1 + point.returnDecimal), 1) - 1;
}

function maxDrawdown(points: NormalizedPoint[]) {
  let equity = 1;
  let peak = 1;
  let drawdown = 0;

  points.forEach((point) => {
    equity *= 1 + point.returnDecimal;
    peak = Math.max(peak, equity);
    drawdown = Math.min(drawdown, equity / peak - 1);
  });

  return drawdown;
}

function annualizedVolatility(points: NormalizedPoint[], periodsPerYear: number) {
  if (points.length < 2) return null;
  const mean = points.reduce((sum, point) => sum + point.returnDecimal, 0) / points.length;
  const variance = points.reduce((sum, point) => sum + (point.returnDecimal - mean) ** 2, 0) / (points.length - 1);
  return Math.sqrt(variance) * Math.sqrt(periodsPerYear);
}

function matchedBenchmarkReturn(points: NormalizedPoint[], benchmarkPoints: NormalizedPoint[]) {
  const benchmarkByDate = new Map(benchmarkPoints.map((point) => [point.date, point.returnDecimal]));
  const matched = points
    .map((point) => {
      const benchmarkReturn = benchmarkByDate.get(point.date);
      return benchmarkReturn === undefined ? null : { date: point.date, returnDecimal: benchmarkReturn };
    })
    .filter((point): point is NormalizedPoint => Boolean(point));

  return matched.length ? compoundReturn(matched) : null;
}

function overfitRisk(sampleSize: number, parameterCount: number, minSampleSize: number): WatchlistStrategyBacktestSummary["overfitRisk"] {
  if (sampleSize < minSampleSize || parameterCount >= 6 || sampleSize / Math.max(parameterCount, 1) < 40) return "high";
  if (sampleSize < minSampleSize * 2 || parameterCount >= 4 || sampleSize / Math.max(parameterCount, 1) < 90) return "medium";
  return "low";
}

function buildLimitations(input: BuildWatchlistStrategyBacktestSummaryInput, sampleSize: number, benchmarkMatched: boolean, risk: WatchlistStrategyBacktestSummary["overfitRisk"]) {
  const minSampleSize = input.minSampleSize ?? DEFAULT_MIN_SAMPLE_SIZE;
  const limitations = [
    "Historical validation is supporting evidence only and does not predict future performance.",
    "The result cannot create a staged-buy plan draft without current evidence and risk veto checks."
  ];

  if (sampleSize < minSampleSize) {
    limitations.push(`Sample size ${sampleSize} is below the minimum review threshold ${minSampleSize}.`);
  }
  if (!benchmarkMatched) {
    limitations.push("Benchmark comparison is unavailable or has no overlapping dates.");
  }
  if (risk !== "low") {
    limitations.push(`Overfitting risk is ${risk}; strategy rules require forward review before use.`);
  }
  if (!validNumber(input.feePercent) && !validNumber(input.slippagePercent)) {
    limitations.push("Fee and slippage assumptions are disclosed text only; no precise execution cost model is applied.");
  }

  return Array.from(new Set(limitations));
}

function conclusionFor(result: {
  strategyName?: string;
  sampleSize: number;
  minSampleSize: number;
  returnPercent: number;
  maxDrawdownPercent: number;
  excessReturnPercent?: number | null;
  overfitRisk: WatchlistStrategyBacktestSummary["overfitRisk"];
}) {
  const name = result.strategyName ? `${result.strategyName}: ` : "";
  if (result.sampleSize < result.minSampleSize) {
    return `${name}historical sample is insufficient; use this only to understand volatility and drawdown, not as plan-draft evidence.`;
  }
  if (result.overfitRisk === "high") {
    return `${name}historical validation has high overfitting risk; it can only support a cautious review or pause decision.`;
  }
  if (result.returnPercent > 0 && result.maxDrawdownPercent > -25 && (result.excessReturnPercent === null || result.excessReturnPercent === undefined || result.excessReturnPercent >= 0)) {
    return `${name}historical validation is acceptable as one supporting signal, but current evidence and risk checks still decide plan readiness.`;
  }
  return `${name}historical validation is weak or volatile; keep it as risk review evidence before any staged-plan draft.`;
}

export function buildWatchlistStrategyBacktestSummary(input: BuildWatchlistStrategyBacktestSummaryInput): WatchlistStrategyBacktestSummary {
  const points = normalizeSeries(input.series);
  const benchmarkPoints = normalizeSeries(input.benchmarkSeries ?? []);
  const sampleSize = points.length;
  const minSampleSize = input.minSampleSize ?? DEFAULT_MIN_SAMPLE_SIZE;
  const periodsPerYear = input.periodsPerYear ?? DEFAULT_PERIODS_PER_YEAR;
  const firstDate = points[0]?.date ?? normalizeDate(input.asOfDate ?? "") ?? "unknown";
  const lastDate = points[points.length - 1]?.date ?? normalizeDate(input.asOfDate ?? "") ?? "unknown";
  const risk = overfitRisk(sampleSize, input.parameterCount ?? 1, minSampleSize);

  if (!sampleSize) {
    return {
      sampleStartDate: firstDate,
      sampleEndDate: lastDate,
      benchmark: input.benchmark,
      feeAssumption: input.feeAssumption,
      returnPercent: null,
      benchmarkReturnPercent: null,
      excessReturnPercent: null,
      maxDrawdownPercent: null,
      volatilityPercent: null,
      winPeriods: 0,
      lossPeriods: 0,
      sampleSize: 0,
      overfitRisk: "high",
      limitations: [
        "No valid historical return or NAV series is available.",
        "Historical validation is supporting evidence only and does not predict future performance.",
        "The result cannot create a staged-buy plan draft without current evidence and risk veto checks."
      ],
      conclusion: "Historical validation is unavailable; the system must treat backtest evidence as missing.",
      methodology: `${METHOD_VERSION}; pure helper using dated NAV or period returns for personal review only.`
    };
  }

  const costDecimal = ((input.feePercent ?? 0) + (input.slippagePercent ?? 0)) / 100;
  const totalReturn = compoundReturn(points) - costDecimal;
  const benchmarkReturn = matchedBenchmarkReturn(points, benchmarkPoints);
  const benchmarkMatched = benchmarkReturn !== null;
  const excessReturn = benchmarkReturn === null ? null : totalReturn - benchmarkReturn;
  const drawdown = maxDrawdown(points);
  const volatility = annualizedVolatility(points, periodsPerYear);
  const returnPercent = roundPercent(totalReturn);
  const maxDrawdownPercent = roundPercent(drawdown);
  const excessReturnPercent = excessReturn === null ? null : roundPercent(excessReturn);

  return {
    sampleStartDate: firstDate,
    sampleEndDate: lastDate,
    benchmark: input.benchmark,
    feeAssumption: input.feeAssumption,
    returnPercent,
    benchmarkReturnPercent: benchmarkReturn === null ? null : roundPercent(benchmarkReturn),
    excessReturnPercent,
    maxDrawdownPercent,
    volatilityPercent: volatility === null ? null : roundPercent(volatility),
    winPeriods: points.filter((point) => point.returnDecimal > 0).length,
    lossPeriods: points.filter((point) => point.returnDecimal < 0).length,
    sampleSize,
    overfitRisk: risk,
    limitations: buildLimitations(input, sampleSize, benchmarkMatched, risk),
    conclusion: conclusionFor({
      strategyName: input.strategyName,
      sampleSize,
      minSampleSize,
      returnPercent,
      maxDrawdownPercent,
      excessReturnPercent,
      overfitRisk: risk
    }),
    methodology: `${METHOD_VERSION}; pure helper using dated NAV or period returns for personal review only.`
  };
}
