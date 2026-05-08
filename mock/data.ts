import {
  FundCompareItem,
  FundListItem,
  HoldingCostScenario,
  IndustryDetailSnapshot,
  IndustryOpportunityCard,
  WatchlistItem
} from "@/types";

function buildHoldingCostSummary(
  day30: number,
  day365: number,
  day730: number,
  freeAfterDays: number
): HoldingCostScenario[] {
  return [
    { holdingDays: 30, totalCostRate: day30, isRedemptionFeeFree: freeAfterDays <= 30 },
    { holdingDays: 365, totalCostRate: day365, isRedemptionFeeFree: true },
    { holdingDays: 730, totalCostRate: day730, isRedemptionFeeFree: true }
  ];
}

export const industryCards: IndustryOpportunityCard[] = [
  {
    industryId: "semiconductor",
    industryName: "半导体",
    opportunityScore: 86,
    trendScore: 82,
    capitalScore: 88,
    valuationScore: 71,
    riskLevel: "中",
    performance5d: 4.8,
    performance20d: 11.6,
    fundCount: 12,
    tags: ["产业催化", "资金回流", "景气验证"],
    summary: "算力链与国产替代共振，景气验证与事件催化同步增强。",
    label: "机会增强"
  },
  {
    industryId: "innovative-medicine",
    industryName: "创新药",
    opportunityScore: 79,
    trendScore: 73,
    capitalScore: 75,
    valuationScore: 85,
    riskLevel: "中",
    performance5d: 2.4,
    performance20d: 8.1,
    fundCount: 9,
    tags: ["低位修复", "估值改善", "政策友好"],
    summary: "估值仍处中低位，适合中期观察和逐步验证修复逻辑。",
    label: "低位关注"
  },
  {
    industryId: "ai-infra",
    industryName: "AI算力基础设施",
    opportunityScore: 84,
    trendScore: 89,
    capitalScore: 91,
    valuationScore: 58,
    riskLevel: "高",
    performance5d: 6.2,
    performance20d: 14.4,
    fundCount: 7,
    tags: ["强趋势", "高热度", "拥挤抬升"],
    summary: "热度和资金最强，但估值与拥挤度风险同步抬升。",
    label: "高热观察"
  },
  {
    industryId: "chemical",
    industryName: "化工新材料",
    opportunityScore: 74,
    trendScore: 69,
    capitalScore: 66,
    valuationScore: 82,
    riskLevel: "中",
    performance5d: 1.7,
    performance20d: 6.5,
    fundCount: 8,
    tags: ["周期修复", "成本改善", "估值偏低"],
    summary: "更偏估值修复与盈利弹性逻辑，适合中线观察，不属于最热主题。",
    label: "趋势确认"
  },
  {
    industryId: "gaming",
    industryName: "游戏传媒",
    opportunityScore: 77,
    trendScore: 76,
    capitalScore: 79,
    valuationScore: 73,
    riskLevel: "中",
    performance5d: 3.6,
    performance20d: 9.4,
    fundCount: 6,
    tags: ["内容周期", "情绪修复", "政策观察"],
    summary: "内容供给与情绪修复带动反弹，但仍需关注政策和业绩兑现节奏。",
    label: "趋势确认"
  },
  {
    industryId: "global-qdii",
    industryName: "全球科技QDII",
    opportunityScore: 81,
    trendScore: 84,
    capitalScore: 78,
    valuationScore: 68,
    riskLevel: "中",
    performance5d: 2.9,
    performance20d: 10.8,
    fundCount: 5,
    tags: ["海外映射", "美元资产", "全球配置"],
    summary: "适合承接海外科技和全球宽基配置需求，但也要关注汇率与海外市场波动。",
    label: "机会增强"
  }
];

const fundPool: FundListItem[] = [
  {
    fundId: "semiconductor-demo-1",
    fundName: "半导体芯片ETF联接A",
    fundCode: "012552",
    fundType: "联接基金",
    theme: "半导体",
    trackingTarget: "中证芯片产业指数",
    return1m: 7.2,
    return3m: 14.6,
    return6m: 8.8,
    maxDrawdown: -17.4,
    volatility: 33.2,
    aum: 24.6,
    feeRate: 0.15,
    tradableOnExchange: false,
    tags: ["低申购费", "主题明确"],
    foundedYears: 4,
    fundCompany: "天弘基金",
    feeRuleSummary: {
      purchaseFeeRate: 0.15,
      managementFeeRate: 0.5,
      custodianFeeRate: 0.1,
      qualityStatus: "fallback"
    },
    holdingCostSummary: buildHoldingCostSummary(0.22, 0.75, 1.35, 30),
    redemptionFeeFreeAfterDays: 30
  },
  {
    fundId: "semiconductor-demo-2",
    fundName: "半导体ETF",
    fundCode: "159995",
    fundType: "ETF",
    theme: "半导体",
    trackingTarget: "国证芯片指数",
    return1m: 8.4,
    return3m: 15.2,
    return6m: 9.1,
    maxDrawdown: -12.6,
    volatility: 24.8,
    aum: 76.2,
    feeRate: 0.5,
    tradableOnExchange: true,
    tags: ["场内可交易", "流动性更好"],
    foundedYears: 5,
    fundCompany: "国泰基金",
    holdingCostSummary: buildHoldingCostSummary(0.28, 0.82, 1.42, 7),
    redemptionFeeFreeAfterDays: 7
  },
  {
    fundId: "medicine-demo-1",
    fundName: "创新药ETF联接A",
    fundCode: "014117",
    fundType: "联接基金",
    theme: "创新药",
    trackingTarget: "中证创新药产业指数",
    return1m: 4.8,
    return3m: 11.5,
    return6m: 7.3,
    maxDrawdown: -14.1,
    volatility: 27.6,
    aum: 18.2,
    feeRate: 0.12,
    tradableOnExchange: false,
    tags: ["估值修复", "联接配置"],
    foundedYears: 3,
    fundCompany: "国泰基金",
    holdingCostSummary: buildHoldingCostSummary(0.19, 0.69, 1.28, 30),
    redemptionFeeFreeAfterDays: 30
  },
  {
    fundId: "medicine-demo-2",
    fundName: "创新药产业ETF",
    fundCode: "560880",
    fundType: "ETF",
    theme: "创新药",
    trackingTarget: "创新药产业指数",
    return1m: 5.1,
    return3m: 11.2,
    return6m: 6.8,
    maxDrawdown: -10.5,
    volatility: 19.8,
    aum: 28.5,
    feeRate: 0.45,
    tradableOnExchange: true,
    tags: ["场内可交易", "中等波动"],
    foundedYears: 4,
    fundCompany: "银华基金",
    holdingCostSummary: buildHoldingCostSummary(0.24, 0.74, 1.34, 7),
    redemptionFeeFreeAfterDays: 7
  },
  {
    fundId: "ai-demo-1",
    fundName: "科创AIETF",
    fundCode: "589090",
    fundType: "ETF",
    theme: "AI算力基础设施",
    trackingTarget: "科创AI主题指数",
    return1m: 9.1,
    return3m: 17.9,
    return6m: 12.8,
    maxDrawdown: -15.8,
    volatility: 30.6,
    aum: 36.4,
    feeRate: 0.5,
    tradableOnExchange: true,
    tags: ["高热主题", "场内可交易"],
    foundedYears: 2,
    fundCompany: "鹏华基金",
    holdingCostSummary: buildHoldingCostSummary(0.31, 0.83, 1.43, 7),
    redemptionFeeFreeAfterDays: 7
  },
  {
    fundId: "ai-demo-2",
    fundName: "科创AI指数发起式A",
    fundCode: "024409",
    fundType: "主动基金",
    theme: "AI算力基础设施",
    trackingTarget: "AI算力基础设施组合",
    return1m: 8.3,
    return3m: 16.1,
    return6m: 10.6,
    maxDrawdown: -18.9,
    volatility: 34.7,
    aum: 11.2,
    feeRate: 0.15,
    tradableOnExchange: false,
    tags: ["主动增强", "高弹性"],
    foundedYears: 1,
    fundCompany: "鑫元基金",
    holdingCostSummary: buildHoldingCostSummary(0.23, 0.76, 1.36, 30),
    redemptionFeeFreeAfterDays: 30
  },
  {
    fundId: "chemical-demo-1",
    fundName: "化工新材料ETF联接A",
    fundCode: "016210",
    fundType: "联接基金",
    theme: "化工新材料",
    trackingTarget: "化工新材料主题指数",
    return1m: 2.9,
    return3m: 8.4,
    return6m: 12.2,
    maxDrawdown: -13.7,
    volatility: 22.8,
    aum: 13.6,
    feeRate: 0.12,
    tradableOnExchange: false,
    tags: ["估值修复", "成本较低"],
    foundedYears: 3,
    fundCompany: "华夏基金",
    holdingCostSummary: buildHoldingCostSummary(0.18, 0.68, 1.26, 30),
    redemptionFeeFreeAfterDays: 30
  },
  {
    fundId: "chemical-demo-2",
    fundName: "化工ETF",
    fundCode: "516020",
    fundType: "ETF",
    theme: "化工新材料",
    trackingTarget: "细分化工指数",
    return1m: 3.4,
    return3m: 9.3,
    return6m: 13.1,
    maxDrawdown: -11.4,
    volatility: 20.7,
    aum: 21.8,
    feeRate: 0.45,
    tradableOnExchange: true,
    tags: ["场内可交易", "周期弹性"],
    foundedYears: 4,
    fundCompany: "富国基金",
    holdingCostSummary: buildHoldingCostSummary(0.25, 0.75, 1.35, 7),
    redemptionFeeFreeAfterDays: 7
  },
  {
    fundId: "gaming-demo-1",
    fundName: "游戏传媒ETF联接A",
    fundCode: "017560",
    fundType: "联接基金",
    theme: "游戏传媒",
    trackingTarget: "中证游戏传媒主题指数",
    return1m: 4.1,
    return3m: 12.4,
    return6m: 9.5,
    maxDrawdown: -16.8,
    volatility: 28.2,
    aum: 9.8,
    feeRate: 0.15,
    tradableOnExchange: false,
    tags: ["情绪修复", "内容周期"],
    foundedYears: 2,
    fundCompany: "易方达基金",
    holdingCostSummary: buildHoldingCostSummary(0.22, 0.72, 1.31, 30),
    redemptionFeeFreeAfterDays: 30
  },
  {
    fundId: "gaming-demo-2",
    fundName: "游戏ETF",
    fundCode: "159869",
    fundType: "ETF",
    theme: "游戏传媒",
    trackingTarget: "中证动漫游戏指数",
    return1m: 4.6,
    return3m: 13.7,
    return6m: 10.2,
    maxDrawdown: -14.6,
    volatility: 24.5,
    aum: 17.4,
    feeRate: 0.5,
    tradableOnExchange: true,
    tags: ["场内可交易", "弹性较强"],
    foundedYears: 4,
    fundCompany: "华夏基金",
    holdingCostSummary: buildHoldingCostSummary(0.28, 0.79, 1.39, 7),
    redemptionFeeFreeAfterDays: 7
  },
  {
    fundId: "qdii-demo-1",
    fundName: "纳斯达克100ETF",
    fundCode: "513100",
    fundType: "QDII",
    theme: "全球科技QDII",
    trackingTarget: "纳斯达克100指数",
    return1m: 6.3,
    return3m: 15.8,
    return6m: 18.6,
    maxDrawdown: -13.2,
    volatility: 22.4,
    aum: 42.8,
    feeRate: 0.5,
    tradableOnExchange: true,
    tags: ["海外科技", "场内可交易", "QDII"],
    foundedYears: 5,
    fundCompany: "国泰基金",
    feeRuleSummary: {
      purchaseFeeRate: 0.5,
      managementFeeRate: 0.6,
      custodianFeeRate: 0.15,
      qualityStatus: "fallback"
    },
    holdingCostSummary: buildHoldingCostSummary(0.33, 0.91, 1.66, 7),
    redemptionFeeFreeAfterDays: 7
  },
  {
    fundId: "qdii-demo-2",
    fundName: "全球科技联接QDIIA",
    fundCode: "016595",
    fundType: "QDII",
    theme: "全球科技QDII",
    trackingTarget: "全球科技主题组合(QDII)",
    return1m: 5.7,
    return3m: 13.9,
    return6m: 16.4,
    maxDrawdown: -14.8,
    volatility: 24.1,
    aum: 16.3,
    feeRate: 0.15,
    tradableOnExchange: false,
    tags: ["海外配置", "QDII", "场外观察"],
    foundedYears: 2,
    fundCompany: "易方达基金",
    feeRuleSummary: {
      purchaseFeeRate: 0.15,
      managementFeeRate: 0.8,
      custodianFeeRate: 0.2,
      qualityStatus: "fallback"
    },
    holdingCostSummary: buildHoldingCostSummary(0.27, 1.15, 2.15, 30),
    redemptionFeeFreeAfterDays: 30
  }
];

function detailForIndustry(
  industryId: string,
  industryName: string,
  headline: string,
  opportunityLabel: IndustryDetailSnapshot["opportunityLabel"],
  thesisSummary: string,
  trendScore: number,
  capitalScore: number,
  valuationScore: number,
  riskScore: number,
  events: Array<{ date: string; title: string; summary: string }>
): IndustryDetailSnapshot {
  return {
    industryId,
    industryName,
    headline,
    opportunityLabel,
    thesisSummary,
    trendMetrics: [{ name: "趋势强度", score: trendScore, summary: "近阶段价格趋势与相对收益保持改善。" }],
    capitalMetrics: [{ name: "资金强度", score: capitalScore, summary: "相关主题资金关注度和成交活跃度同步改善。" }],
    valuationMetrics: [{ name: "估值性价比", score: valuationScore, summary: "当前估值位置更适合做研究辅助，不直接替代选基指标。" }],
    riskMetrics: [{ name: "拥挤度风险", score: riskScore, summary: "需关注短期拥挤交易、业绩兑现和风格切换风险。" }],
    timelineEvents: events,
    chartSeries: [
      { label: "第 1 周", value: Math.max(52, trendScore - 16) },
      { label: "第 2 周", value: Math.max(56, trendScore - 10) },
      { label: "第 3 周", value: Math.max(60, trendScore - 5) },
      { label: "第 4 周", value: trendScore }
    ],
    relatedFunds: fundPool.filter((fund) => fund.theme === industryName),
    disclaimer: "行业结论用于观察优先级排序，不构成投资建议。"
  };
}

export const industryDetails: Record<string, IndustryDetailSnapshot> = {
  semiconductor: detailForIndustry(
    "semiconductor",
    "半导体",
    "趋势、景气和事件催化共振，处于重点跟踪区间。",
    "机会增强",
    "受益于算力链扩产、国产替代和产业资本开支改善，板块具备继续跟踪价值，但短线波动可能放大。",
    82,
    88,
    71,
    63,
    [
      { date: "04-08", title: "设备订单超预期", summary: "强化了市场对景气修复和产能兑现的预期。" },
      { date: "04-19", title: "ETF 净流入放大", summary: "资金回流提升板块关注度。" }
    ]
  ),
  "innovative-medicine": detailForIndustry(
    "innovative-medicine",
    "创新药",
    "估值修复特征更明显，适合中期观察。",
    "低位关注",
    "行业估值仍处于中低区间，更适合放入中期观察清单，重点看政策和商业化兑现节奏。",
    73,
    75,
    85,
    56,
    [
      { date: "04-10", title: "创新药支持政策再提", summary: "改善市场对行业景气的中期预期。" },
      { date: "04-17", title: "重点公司海外授权推进", summary: "增强商业化兑现信心。" }
    ]
  ),
  "ai-infra": detailForIndustry(
    "ai-infra",
    "AI算力基础设施",
    "趋势最强，但热度和拥挤度同步偏高。",
    "高热观察",
    "更适合作为强趋势主题去观察，不适合简单用热度代替结论，需要搭配成本、估值和风险一起看。",
    89,
    91,
    58,
    82,
    [
      { date: "04-11", title: "算力资本开支预期上修", summary: "带动国内映射方向走强。" },
      { date: "04-18", title: "主题成交创新高", summary: "说明热度与拥挤度同时抬升。" }
    ]
  ),
  chemical: detailForIndustry(
    "chemical",
    "化工新材料",
    "更偏盈利弹性与估值修复，不属于最热但具备研究价值。",
    "趋势确认",
    "化工新材料更适合作为中线观察方向，核心在盈利修复和供需改善，不宜简单按热度打分。",
    69,
    66,
    82,
    54,
    [
      { date: "04-09", title: "原料成本回落", summary: "提升盈利弹性预期。" },
      { date: "04-16", title: "细分材料订单改善", summary: "强化中期景气修复逻辑。" }
    ]
  ),
  gaming: detailForIndustry(
    "gaming",
    "游戏传媒",
    "内容供给和情绪修复共振，仍需观察兑现节奏。",
    "趋势确认",
    "游戏传媒更容易受情绪与政策影响，适合与成本较低、代表性较强的指数产品一起观察。",
    76,
    79,
    73,
    61,
    [
      { date: "04-12", title: "重点新游上线表现改善", summary: "带动板块风险偏好回升。" },
      { date: "04-20", title: "传媒子板块成交活跃", summary: "阶段性情绪修复继续扩散。" }
    ]
  ),
  "global-qdii": detailForIndustry(
    "global-qdii",
    "全球科技QDII",
    "更适合承接海外科技映射和全球资产配置需求。",
    "机会增强",
    "QDII 主题更适合放在跨市场配置视角中看，核心不是单纯追热度，而是看全球科技景气、汇率和持有成本的平衡。",
    84,
    78,
    68,
    59,
    [
      { date: "04-10", title: "海外科技股延续强势", summary: "带动纳指相关 QDII 关注度上升。" },
      { date: "04-18", title: "汇率波动放大", summary: "说明 QDII 产品还需要结合汇率风险一起看。" }
    ]
  )
};

export const compareItems: FundCompareItem[] = fundPool.map((fund) => ({
  fundId: fund.fundId,
  fundName: fund.fundName,
  fundCode: fund.fundCode,
  returnMetrics: {
    month1: fund.return1m,
    month3: fund.return3m,
    month6: fund.return6m
  },
  riskMetrics: {
    maxDrawdown: fund.maxDrawdown,
    volatility: fund.volatility
  },
  feeRate: fund.feeRate,
  aum: fund.aum,
  inceptionDate: "2022-03-15",
  topHoldings:
    fund.theme === "半导体"
      ? ["北方华创", "中微公司", "沪硅产业"]
      : fund.theme === "创新药"
        ? ["百济神州", "恒瑞医药", "信达生物"]
        : fund.theme === "AI算力基础设施"
          ? ["中际旭创", "新易盛", "寒武纪"]
          : fund.theme === "化工新材料"
            ? ["万华化学", "华鲁恒升", "新宙邦"]
            : fund.theme === "全球科技QDII"
              ? ["苹果", "微软", "英伟达"]
              : ["恺英网络", "三七互娱", "吉比特"],
  concentration: fund.fundType === "主动基金" ? "中高" : "中",
  trackingDeviationNote:
    fund.fundType === "主动基金"
      ? "主动管理产品更适合看风格和回撤控制，不适合直接拿来做跟踪误差比较。"
      : "更适合做同主题指数表达和长期持有成本的横向比较。",
  feeRule: fund.feeRuleSummary ?? null,
  redemptionRules: [
    {
      minHoldingDays: 0,
      maxHoldingDays: (fund.redemptionFeeFreeAfterDays ?? 30) - 1,
      redemptionFeeRate: 0.5,
      ruleText: `持有少于 ${fund.redemptionFeeFreeAfterDays ?? 30} 天，赎回费仍有影响。`,
      isFreeThreshold: false,
      priorityRank: 1
    },
    {
      minHoldingDays: fund.redemptionFeeFreeAfterDays ?? 30,
      maxHoldingDays: null,
      redemptionFeeRate: 0,
      ruleText: `持有不少于 ${fund.redemptionFeeFreeAfterDays ?? 30} 天，视为进入免赎回费区间。`,
      isFreeThreshold: true,
      priorityRank: 2
    }
  ],
  holdingCostSummary: fund.holdingCostSummary
}));

export const watchlistSeed: WatchlistItem[] = [
  {
    itemId: "semiconductor",
    itemType: "industry",
    displayName: "半导体",
    statusLabel: "机会增强",
    latestChange: "资金热度连续抬升",
    updatedAt: "2026-04-21 09:30",
    entryLink: "/industries/semiconductor"
  },
  {
    itemId: "gaming",
    itemType: "industry",
    displayName: "游戏传媒",
    statusLabel: "趋势确认",
    latestChange: "内容周期改善，情绪修复延续",
    updatedAt: "2026-04-21 09:30",
    entryLink: "/industries/gaming"
  },
  {
    itemId: "chemical-demo-1",
    itemType: "fund",
    displayName: "化工新材料ETF联接A",
    statusLabel: "成本友好",
    latestChange: "30 天成本处于同主题较低区间",
    updatedAt: "2026-04-21 09:30",
    entryLink: "/funds"
  },
  {
    itemId: "qdii-demo-1",
    itemType: "fund",
    displayName: "纳斯达克100ETF",
    statusLabel: "海外配置",
    latestChange: "近 3 月表现较强，但需要同时关注汇率与海外波动。",
    updatedAt: "2026-04-21 09:30",
    entryLink: "/funds"
  }
];

export const funds = fundPool;
