import { IndustryEventImpactLabel, IndustryEventImpactSummary, IndustryLongTermEvent, StrategyConfidence } from "@/types";

export type CalculateIndustryEventImpactInput = {
  industryId: string;
  events: IndustryLongTermEvent[];
  asOfDate?: string;
};

const METHOD_VERSION = "mock-industry-event-impact-v1";

function eventWeight(event: IndustryLongTermEvent) {
  const confidenceWeight = event.confidence === "high" ? 3 : event.confidence === "medium" ? 2 : 1;
  const freshnessWeight = event.freshness === "fresh" ? 1 : event.freshness === "watch" ? 0 : -1;
  return Math.max(0, confidenceWeight + freshnessWeight);
}

function confidenceFromBalance(supportScore: number, riskScore: number, eventCount: number): StrategyConfidence {
  if (eventCount < 2) return "low";
  const total = supportScore + riskScore;
  if (total >= 7 && Math.abs(supportScore - riskScore) >= 3) return "high";
  if (total >= 3) return "medium";
  return "low";
}

function impactDirection(supportScore: number, riskScore: number, shortTermNoiseCount: number): IndustryEventImpactLabel {
  if (supportScore === 0 && riskScore === 0 && shortTermNoiseCount > 0) return "short_term_noise";
  if (supportScore >= riskScore + 3) return "long_term_support";
  if (riskScore >= supportScore + 2) return "risk_or_invalidation";
  if (supportScore > 0 || riskScore > 0) return "mixed";
  return "insufficient_evidence";
}

export function calculateIndustryEventImpact(input: CalculateIndustryEventImpactInput): IndustryEventImpactSummary {
  const events = input.events.filter((event) => event.industryId === input.industryId);
  const supportEvents = events.filter((event) => event.longTermImpact === "long_term_support");
  const riskEvents = events.filter((event) => event.longTermImpact === "risk_or_invalidation");
  const shortTermNoiseEvents = events.filter((event) => event.longTermImpact === "short_term_noise");
  const mixedEvents = events.filter((event) => event.longTermImpact === "mixed");
  const insufficientEvents = events.filter((event) => event.longTermImpact === "insufficient_evidence");
  const supportScore = supportEvents.reduce((sum, event) => sum + eventWeight(event), 0) + mixedEvents.length;
  const riskScore = riskEvents.reduce((sum, event) => sum + eventWeight(event), 0) + mixedEvents.length + insufficientEvents.length;

  return {
    industryId: input.industryId,
    asOfDate: input.asOfDate ?? new Date().toISOString().slice(0, 10),
    supportCount: supportEvents.length,
    riskCount: riskEvents.length + insufficientEvents.length,
    shortTermNoiseCount: shortTermNoiseEvents.length,
    confidence: confidenceFromBalance(supportScore, riskScore, events.length),
    impactDirection: impactDirection(supportScore, riskScore, shortTermNoiseEvents.length),
    supportingEvidence: [...supportEvents, ...mixedEvents].map((event) => event.thesisEffect).slice(0, 4),
    weakeningEvidence: [...riskEvents, ...insufficientEvents, ...mixedEvents].map((event) => event.riskNote).slice(0, 4),
    invalidationConditions: events.map((event) => event.invalidationSignal).filter((value): value is string => Boolean(value)).slice(0, 4),
    riskControlHint: "行业事件只用于长期 thesis 复盘和风险提示，不直接生成买入或卖出指令；短期事件需要等待价格、订单和盈利数据继续验证。",
    methodology: `${METHOD_VERSION}; events are grouped as long-term evidence, weakening evidence, or short-term noise for personal review only.`
  };
}
