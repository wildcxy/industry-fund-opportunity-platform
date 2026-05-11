export function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatRate(value?: number | null, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${value.toFixed(digits)}%`;
}

export function formatAum(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return `${value.toFixed(1)} 亿元`;
}

export function scoreTone(score: number) {
  if (score >= 80) return "text-pine bg-mint/25";
  if (score >= 65) return "text-ink bg-sand";
  return "text-ember bg-ember/10";
}
