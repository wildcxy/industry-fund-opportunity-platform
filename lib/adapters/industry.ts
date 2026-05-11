import { fetchBackendJson } from "@/lib/backend-api";
import { isDemoMode } from "@/lib/data-mode";
import { MOCK_SNAPSHOT_UPDATED_AT } from "@/lib/mock-metadata";
import { calculateIndustryEventImpact } from "@/lib/strategy/industry-events";
import { funds, industryCards, industryDetails, mockIndustryLongTermEvents } from "@/mock/data";
import { ChartPoint, DetailMetric, FundListItem, HomepageViewData, IndustryDetailView, IndustryHomepageView, MetricExplain, TimelineEvent } from "@/types";

type HomepageResponse = {
  snapshot?: {
    updatedAt?: string;
    data?: {
      industries?: Array<Partial<IndustryHomepageView>>;
      marketOverview?: HomepageViewData["marketOverview"];
      globalFundPicks?: HomepageViewData["globalFundPicks"];
    };
  };
};

type IndustryDetailResponse = {
  snapshot?: {
    data?: Partial<IndustryDetailView>;
  };
};

const DATA_VERSION_LABELS: Record<string, string> = {
  "tushare-industry-top10-v1": "Tushare行业基金池",
  "manual-drop-v1": "盘后快照",
  "portfolio-snapshot": "持仓快照"
};

function normalizeTag(tag: string) {
  return DATA_VERSION_LABELS[tag] ?? tag;
}

function normalizeFundTags<T extends FundListItem>(fund: T): T {
  return {
    ...fund,
    tags: Array.from(new Set((fund.tags ?? []).map(normalizeTag)))
  };
}

function normalizeFunds<T extends FundListItem>(items?: T[]) {
  return (items ?? []).map(normalizeFundTags);
}

function buildMethodology() {
  return {
    title: "评分口径",
    content: "综合趋势、资金、估值与风险因子进行样例展示，不构成投资建议。"
  };
}

function defaultMethodologyNotes(): MetricExplain[] {
  return [
    {
      title: "趋势强度口径",
      content: "参考近 20 日、60 日与 120 日代理动量，并结合回撤、波动和短期过热风险做观察优先级判断。"
    },
    {
      title: "资金强度口径",
      content: "参考行业相关基金池的热度、成交活跃度或资金流向代理指标；当前为盘后快照口径，不代表实时资金流。"
    },
    {
      title: "估值与风险口径",
      content: "估值只用于判断研究性价比，风险项重点关注拥挤度、波动、回撤和数据缺口；高风险会降低或阻断买入观察推进。"
    },
    {
      title: "策略边界",
      content: "本页只做个人研究观察，不输出自动交易或无条件买入结论；事件和热度必须与基金指标、持仓约束一起复核。"
    }
  ];
}

function buildCapitalHeatSeries(chartSeries: ChartPoint[], capitalMetrics: DetailMetric[]): ChartPoint[] {
  const capitalPoint = chartSeries.find((point) => point.label.includes("资金"));
  const base = capitalMetrics[0]?.score ?? capitalPoint?.value;
  if (base === undefined) {
    return [];
  }

  return [
    { label: "低位参考", value: Math.max(0, Math.min(100, base - 10)) },
    { label: "趋势确认", value: Math.max(0, Math.min(100, base - 4)) },
    { label: "近期热度", value: Math.max(0, Math.min(100, base + 2)) },
    { label: "当前资金", value: Math.max(0, Math.min(100, base)) }
  ];
}

function buildLongTermEventsFromTimeline(
  industryId: string,
  industryName: string,
  timelineEvents: TimelineEvent[],
  riskMetrics: DetailMetric[]
): NonNullable<IndustryDetailView["longTermEvents"]> {
  const isHighRisk = (riskMetrics[0]?.score ?? 0) >= 75;

  return timelineEvents.map((event, index) => ({
    eventId: `${industryId}-${event.date}-${index + 1}`,
    industryId,
    industryName,
    eventDate: event.date,
    publishedAt: event.date,
    sourceType: "manual_import",
    sourceName: "行业事件快照",
    title: event.title,
    summary: event.summary,
    category: "other",
    longTermImpact: isHighRisk ? "risk_or_invalidation" : "long_term_support",
    confidence: "medium",
    freshness: "watch",
    thesisEffect: event.summary,
    riskNote: isHighRisk
      ? "当前风险或拥挤度偏高，该事件只作为复核线索，不能单独推进买入观察。"
      : "该事件只用于验证行业长期逻辑，仍需结合趋势、估值、资金和基金持仓匹配度复核。",
    invalidationSignal: "后续数据无法验证事件兑现、资金退潮或风险评分继续抬升时，需要下调观察优先级。"
  }));
}

function buildFallbackTrendStrategy(industryName: string) {
  return {
    strategyScore: 55,
    signal: "继续验证",
    momentumScore: 55,
    drawdownControlScore: 55,
    volatilityControlScore: 55,
    trendQualityScore: 55,
    overheatRiskScore: 35,
    return20d: null,
    return60d: null,
    return120dProxy: null,
    maxDrawdownProxy: null,
    volatilityProxy: null,
    hint: `${industryName}当前使用演示趋势策略占位，真实判断需要盘后净值、行业指数与回撤数据共同验证。`,
    riskControlHint: "趋势策略用于观察优先级，不构成买卖建议；回撤和波动缺失时，应降低结论置信度。",
    methodology: "演示口径：等待真实 20/60/120 日动量、回撤与波动数据补齐后计算。"
  };
}

function buildHomepageFallback(): HomepageViewData {
  const industries = industryCards.map((item) => ({
    ...item,
    focusReason:
      item.label === "机会增强"
        ? "趋势、资金与产业催化形成共振，适合作为当前重点跟踪方向。"
        : item.label === "低位关注"
          ? "估值位置更有吸引力，适合结合中期观察逐步验证。"
          : "热度较高，适合观察强趋势与风险提示之间的平衡。",
    methodology: buildMethodology(),
    trendStrategy: buildFallbackTrendStrategy(item.industryName),
    updatedAt: MOCK_SNAPSHOT_UPDATED_AT,
    relatedFunds: funds.filter((fund) => fund.theme === item.industryName).slice(0, 2)
  }));

  const strongTrendCount = industries.filter((item) => item.trendScore >= 80).length;
  const lowPositionCount = industries.filter((item) => item.valuationScore >= 80).length;

  return {
    industries,
    marketOverview: {
      summary:
        "当前行业池同时覆盖强趋势、高热主题与估值修复方向，更适合先做行业发现，再映射到基金做长期持有比较。",
      strongTrendCount,
      lowPositionCount
    },
    globalFundPicks: {
      title: "今日全局基金 TOP3 观察池",
      methodology: "演示兜底候选，仅用于前端降级展示；真实候选由后端盘后评分生成。",
      items: funds.slice(0, 3).map((fund) => ({
        ...fund,
        observationScore: fund.rankingScore ?? 55,
        actionLabel: fund.rankingSignal ?? "继续跟踪候选",
        reason: "后端不可用时使用演示候选，真实复盘请以后端快照为准。",
        riskNote: "演示数据不构成买入建议。"
      }))
    },
    updatedAt: MOCK_SNAPSHOT_UPDATED_AT
  };
}

function buildIndustryDetailFallback(industryId: string): IndustryDetailView | null {
  const detail = industryDetails[industryId];
  if (!detail) {
    return null;
  }

  return {
    ...detail,
    eventImpactSummary: detail.eventImpactSummary ?? calculateIndustryEventImpact({
      industryId,
      events: detail.longTermEvents ?? mockIndustryLongTermEvents
    }),
    conclusionCards: [
      {
        title: "当前判断",
        value: detail.opportunityLabel,
        summary: detail.headline
      },
      {
        title: "趋势强度",
        value: `${detail.trendMetrics[0]?.score ?? 0}`,
        summary: detail.trendMetrics[0]?.summary ?? "当前仅展示文字摘要"
      },
      {
        title: "资金强度",
        value: `${detail.capitalMetrics[0]?.score ?? 0}`,
        summary: detail.capitalMetrics[0]?.summary ?? "当前仅展示文字摘要"
      },
      {
        title: "估值性价比",
        value: `${detail.valuationMetrics[0]?.score ?? 0}`,
        summary: detail.valuationMetrics[0]?.summary ?? "当前仅展示文字摘要"
      },
      {
        title: "拥挤度风险",
        value: `${detail.riskMetrics[0]?.score ?? 0}`,
        summary: detail.riskMetrics[0]?.summary ?? "当前仅展示文字摘要"
      }
    ],
    methodologyNotes: [
      ...defaultMethodologyNotes()
    ],
    capitalHeatSeries:
      detail.capitalMetrics.length > 0
        ? detail.chartSeries.map((point, index) => ({
            label: point.label,
            value: Math.max(45, Math.min(95, point.value - 6 + index * 2))
          }))
        : [],
    trendStrategy: buildFallbackTrendStrategy(detail.industryName)
  };
}

function mergeHomepageIndustry(item: Partial<IndustryHomepageView>, fallback: IndustryHomepageView, demoMode: boolean): IndustryHomepageView {
  if (!demoMode) {
    const industryName = item.industryName ?? item.industryId ?? "";
    return {
      industryId: item.industryId ?? industryName,
      industryName,
      opportunityScore: item.opportunityScore ?? 0,
      trendScore: item.trendScore ?? 0,
      capitalScore: item.capitalScore ?? 0,
      valuationScore: item.valuationScore ?? 0,
      riskLevel: item.riskLevel ?? fallback.riskLevel,
      performance5d: item.performance5d ?? 0,
      performance20d: item.performance20d ?? 0,
      fundCount: item.fundCount ?? item.relatedFunds?.length ?? 0,
      tags: item.tags ?? [],
      summary: item.summary ?? "",
      label: item.label ?? fallback.label,
      focusReason: item.focusReason ?? "",
      methodology: item.methodology,
      updatedAt: item.updatedAt,
      relatedFunds: normalizeFunds(item.relatedFunds),
      trendStrategy: item.trendStrategy
    };
  }

  return {
    ...fallback,
    ...item,
    focusReason: item.focusReason ?? fallback.focusReason,
    methodology: item.methodology ?? fallback.methodology,
    updatedAt: item.updatedAt ?? fallback.updatedAt,
    relatedFunds:
      item.relatedFunds && item.relatedFunds.length > 0
        ? normalizeFunds(item.relatedFunds)
        : normalizeFunds(funds.filter((fund) => fund.theme === (item.industryName ?? fallback.industryName)).slice(0, 2)),
    trendStrategy: item.trendStrategy ?? fallback.trendStrategy
  };
}

function isMissingBackendIndustry(item: IndustryHomepageView, backendIndustryIds: Set<string>) {
  return !backendIndustryIds.has(item.industryId);
}

export async function getHomepageIndustryView(): Promise<HomepageViewData> {
  const fallback = buildHomepageFallback();
  const demoMode = isDemoMode();

  try {
    const response = await fetchBackendJson<HomepageResponse>("/api/industries", { revalidate: 60 });
    const industries = response.snapshot?.data?.industries;
    const marketOverview = response.snapshot?.data?.marketOverview;
    const globalFundPicks = response.snapshot?.data?.globalFundPicks;

    if (!industries || industries.length === 0 || !marketOverview) {
      return demoMode
        ? fallback
        : {
            industries: [],
            marketOverview: marketOverview ?? {
              summary: "后端真实行业快照暂不可用。",
              strongTrendCount: 0,
              lowPositionCount: 0
            },
            updatedAt: response.snapshot?.updatedAt
          };
    }

    const backendIndustryIds = new Set(industries.map((item) => item.industryId).filter((value): value is string => Boolean(value)));
    const mergedIndustries = industries.map((item) => {
      const fallbackItem =
        fallback.industries.find((industry) => industry.industryId === item.industryId) ?? fallback.industries[0];

      return mergeHomepageIndustry(item, fallbackItem, demoMode);
    });
    const fallbackOnlyIndustries = demoMode ? fallback.industries.filter((item) => isMissingBackendIndustry(item, backendIndustryIds)) : [];

    return {
      industries: [...mergedIndustries, ...fallbackOnlyIndustries],
      marketOverview,
      globalFundPicks: globalFundPicks ?? (demoMode ? fallback.globalFundPicks : undefined),
      updatedAt: response.snapshot?.updatedAt ?? fallback.updatedAt
    };
  } catch {
    return demoMode
      ? fallback
      : {
          industries: [],
          marketOverview: {
            summary: "后端真实行业快照暂不可用。",
            strongTrendCount: 0,
            lowPositionCount: 0
          }
        };
  }
}

export async function getIndustryDetailView(industryId: string): Promise<IndustryDetailView | null> {
  const fallback = buildIndustryDetailFallback(industryId);
  const demoMode = isDemoMode();

  try {
    const response = await fetchBackendJson<IndustryDetailResponse>(`/api/industries/${industryId}`, { revalidate: 60 });
    const snapshot = response.snapshot?.data;

    if (!snapshot) {
      return demoMode ? fallback : null;
    }
    const resolvedIndustryName = snapshot.industryName ?? (demoMode ? fallback?.industryName : undefined) ?? industryId;
    const resolvedTimelineEvents =
      snapshot.timelineEvents && snapshot.timelineEvents.length > 0
        ? snapshot.timelineEvents
        : demoMode
          ? fallback?.timelineEvents ?? []
          : [];
    const resolvedTrendMetrics =
      snapshot.trendMetrics && snapshot.trendMetrics.length > 0
        ? snapshot.trendMetrics
        : demoMode
          ? fallback?.trendMetrics ?? []
          : [];
    const resolvedCapitalMetrics =
      snapshot.capitalMetrics && snapshot.capitalMetrics.length > 0
        ? snapshot.capitalMetrics
        : demoMode
          ? fallback?.capitalMetrics ?? []
          : [];
    const resolvedValuationMetrics =
      snapshot.valuationMetrics && snapshot.valuationMetrics.length > 0
        ? snapshot.valuationMetrics
        : demoMode
          ? fallback?.valuationMetrics ?? []
          : [];
    const resolvedRiskMetrics =
      snapshot.riskMetrics && snapshot.riskMetrics.length > 0
        ? snapshot.riskMetrics
        : demoMode
          ? fallback?.riskMetrics ?? []
          : [];
    const resolvedChartSeries =
      snapshot.chartSeries && snapshot.chartSeries.length > 0
        ? snapshot.chartSeries
        : demoMode
          ? fallback?.chartSeries ?? []
          : [];
    const resolvedLongTermEvents =
      snapshot.longTermEvents && snapshot.longTermEvents.length > 0
        ? snapshot.longTermEvents
        : buildLongTermEventsFromTimeline(industryId, resolvedIndustryName, resolvedTimelineEvents, resolvedRiskMetrics);

    return {
      ...(demoMode ? fallback ?? {} : {}),
      industryId: snapshot.industryId ?? (demoMode ? fallback?.industryId : undefined) ?? industryId,
      industryName: resolvedIndustryName,
      headline: snapshot.headline ?? (demoMode ? fallback?.headline : undefined) ?? "",
      opportunityLabel: snapshot.opportunityLabel ?? (demoMode ? fallback?.opportunityLabel : undefined) ?? "趋势确认",
      thesisSummary: snapshot.thesisSummary ?? (demoMode ? fallback?.thesisSummary : undefined) ?? snapshot.headline ?? "",
      conclusionCards:
        snapshot.conclusionCards && snapshot.conclusionCards.length > 0
          ? snapshot.conclusionCards
          : demoMode
            ? fallback?.conclusionCards ?? []
            : [],
      timelineEvents:
        resolvedTimelineEvents,
      trendMetrics: resolvedTrendMetrics,
      capitalMetrics: resolvedCapitalMetrics,
      valuationMetrics: resolvedValuationMetrics,
      riskMetrics: resolvedRiskMetrics,
      chartSeries: resolvedChartSeries,
      relatedFunds:
        snapshot.relatedFunds && snapshot.relatedFunds.length > 0
          ? normalizeFunds(snapshot.relatedFunds)
          : demoMode
            ? normalizeFunds(fallback?.relatedFunds)
            : [],
      methodologyNotes:
        snapshot.methodologyNotes && snapshot.methodologyNotes.length > 0
          ? snapshot.methodologyNotes
          : demoMode && fallback?.methodologyNotes?.length
            ? fallback.methodologyNotes
            : defaultMethodologyNotes(),
      capitalHeatSeries:
        snapshot.capitalHeatSeries && snapshot.capitalHeatSeries.length > 0
          ? snapshot.capitalHeatSeries
          : buildCapitalHeatSeries(resolvedChartSeries, resolvedCapitalMetrics),
      trendStrategy: snapshot.trendStrategy ?? (demoMode ? fallback?.trendStrategy : undefined),
      longTermEvents: resolvedLongTermEvents,
      eventImpactSummary:
        snapshot.eventImpactSummary ??
        calculateIndustryEventImpact({
          industryId,
          events: resolvedLongTermEvents.length > 0 ? resolvedLongTermEvents : demoMode ? fallback?.longTermEvents ?? mockIndustryLongTermEvents : []
        }),
      disclaimer: snapshot.disclaimer ?? (demoMode ? fallback?.disclaimer : undefined) ?? ""
    };
  } catch {
    return demoMode ? fallback : null;
  }
}
