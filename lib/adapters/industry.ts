import { fetchBackendJson } from "@/lib/backend-api";
import { funds, industryCards, industryDetails } from "@/mock/data";
import { HomepageViewData, IndustryDetailView, IndustryHomepageView } from "@/types";

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

function buildMethodology() {
  return {
    title: "评分口径",
    content: "综合趋势、资金、估值与风险因子进行样例展示，不构成投资建议。"
  };
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
    updatedAt: "2026-04-21 10:00",
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
    updatedAt: "2026-04-21 10:00"
  };
}

function buildIndustryDetailFallback(industryId: string): IndustryDetailView | null {
  const detail = industryDetails[industryId];
  if (!detail) {
    return null;
  }

  return {
    ...detail,
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
      {
        title: "趋势强度口径",
        content: "参考近 5 日、20 日、60 日表现及相对基准的超额收益。"
      },
      {
        title: "资金强度口径",
        content: "参考行业相关 ETF 资金流向、成交额与市场关注度变化。"
      },
      {
        title: "估值与风险口径",
        content: "估值位置仅作区间展示，风险提示重点关注拥挤度、波动与短期涨幅。"
      }
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

function mergeHomepageIndustry(item: Partial<IndustryHomepageView>, fallback: IndustryHomepageView): IndustryHomepageView {
  return {
    ...fallback,
    ...item,
    focusReason: item.focusReason ?? fallback.focusReason,
    methodology: item.methodology ?? fallback.methodology,
    updatedAt: item.updatedAt ?? fallback.updatedAt,
    relatedFunds:
      item.relatedFunds && item.relatedFunds.length > 0
        ? item.relatedFunds
        : funds.filter((fund) => fund.theme === (item.industryName ?? fallback.industryName)).slice(0, 2),
    trendStrategy: item.trendStrategy ?? fallback.trendStrategy
  };
}

export async function getHomepageIndustryView(): Promise<HomepageViewData> {
  const fallback = buildHomepageFallback();

  try {
    const response = await fetchBackendJson<HomepageResponse>("/api/industries");
    const industries = response.snapshot?.data?.industries;
    const marketOverview = response.snapshot?.data?.marketOverview;
    const globalFundPicks = response.snapshot?.data?.globalFundPicks;

    if (!industries || industries.length === 0 || !marketOverview) {
      return fallback;
    }

    const mergedIndustries = industries.map((item) => {
      const fallbackItem =
        fallback.industries.find((industry) => industry.industryId === item.industryId) ?? fallback.industries[0];

      return mergeHomepageIndustry(item, fallbackItem);
    });

    return {
      industries: mergedIndustries,
      marketOverview,
      globalFundPicks: globalFundPicks ?? fallback.globalFundPicks,
      updatedAt: response.snapshot?.updatedAt ?? fallback.updatedAt
    };
  } catch {
    return fallback;
  }
}

export async function getIndustryDetailView(industryId: string): Promise<IndustryDetailView | null> {
  const fallback = buildIndustryDetailFallback(industryId);

  try {
    const response = await fetchBackendJson<IndustryDetailResponse>(`/api/industries/${industryId}`);
    const snapshot = response.snapshot?.data;

    if (!snapshot) {
      return fallback;
    }

    return {
      ...(fallback ?? {}),
      industryId: snapshot.industryId ?? fallback?.industryId ?? industryId,
      industryName: snapshot.industryName ?? fallback?.industryName ?? industryId,
      headline: snapshot.headline ?? fallback?.headline ?? "",
      opportunityLabel: snapshot.opportunityLabel ?? fallback?.opportunityLabel ?? "趋势确认",
      thesisSummary: snapshot.thesisSummary ?? fallback?.thesisSummary ?? snapshot.headline ?? "",
      conclusionCards:
        snapshot.conclusionCards && snapshot.conclusionCards.length > 0
          ? snapshot.conclusionCards
          : fallback?.conclusionCards ?? [],
      timelineEvents:
        snapshot.timelineEvents && snapshot.timelineEvents.length > 0
          ? snapshot.timelineEvents
          : fallback?.timelineEvents ?? [],
      trendMetrics:
        snapshot.trendMetrics && snapshot.trendMetrics.length > 0
          ? snapshot.trendMetrics
          : fallback?.trendMetrics ?? [],
      capitalMetrics:
        snapshot.capitalMetrics && snapshot.capitalMetrics.length > 0
          ? snapshot.capitalMetrics
          : fallback?.capitalMetrics ?? [],
      valuationMetrics:
        snapshot.valuationMetrics && snapshot.valuationMetrics.length > 0
          ? snapshot.valuationMetrics
          : fallback?.valuationMetrics ?? [],
      riskMetrics:
        snapshot.riskMetrics && snapshot.riskMetrics.length > 0
          ? snapshot.riskMetrics
          : fallback?.riskMetrics ?? [],
      chartSeries:
        snapshot.chartSeries && snapshot.chartSeries.length > 0
          ? snapshot.chartSeries
          : fallback?.chartSeries ?? [],
      relatedFunds:
        snapshot.relatedFunds && snapshot.relatedFunds.length > 0
          ? snapshot.relatedFunds
          : fallback?.relatedFunds ?? [],
      methodologyNotes:
        snapshot.methodologyNotes && snapshot.methodologyNotes.length > 0
          ? snapshot.methodologyNotes
          : fallback?.methodologyNotes ?? [],
      capitalHeatSeries:
        snapshot.capitalHeatSeries && snapshot.capitalHeatSeries.length > 0
          ? snapshot.capitalHeatSeries
          : fallback?.capitalHeatSeries ?? [],
      trendStrategy: snapshot.trendStrategy ?? fallback?.trendStrategy,
      disclaimer: snapshot.disclaimer ?? fallback?.disclaimer ?? ""
    };
  } catch {
    return fallback;
  }
}
