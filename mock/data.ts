import {
  AiEvidenceItem,
  AiSourceDocument,
  BuyPlan,
  FundCompareItem,
  FundScore,
  FundListItem,
  HoldingCostScenario,
  IndustryDetailSnapshot,
  IndustryEventImpactSummary,
  IndustryLongTermEvent,
  PostBuyReview,
  IndustryOpportunityCard,
  WatchlistItem,
  WatchlistStrategyBacktestSeriesPoint,
  WatchlistStrategyBacktestSummary,
  WatchlistStrategyManualAssumptionRef,
  WatchlistStrategyMissingEvidence,
  WatchlistStrategyState
} from "@/types";
import { buildWatchlistStrategyBacktestSummary } from "@/lib/strategy/backtest";

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
    industryId: "cpo-optical-communication",
    industryName: "CPO光通信",
    opportunityScore: 83,
    trendScore: 86,
    capitalScore: 84,
    valuationScore: 62,
    riskLevel: "高",
    performance5d: 5.4,
    performance20d: 13.2,
    fundCount: 6,
    tags: ["AI通信链", "光模块", "长期事件验证"],
    summary: "CPO 与高速光模块是 AI 算力扩张中的通信环节，长期逻辑需要用订单、资本开支和海外需求持续验证。",
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
    fundId: "cpo-demo-1",
    fundName: "通信设备ETF",
    fundCode: "515880",
    fundType: "ETF",
    theme: "CPO光通信",
    themeAliases: ["AI算力基础设施", "通信"],
    trackingTarget: "中证全指通信设备指数",
    return1m: 7.8,
    return3m: 14.9,
    return6m: 11.6,
    maxDrawdown: -16.2,
    volatility: 29.4,
    aum: 32.5,
    feeRate: 0.5,
    tradableOnExchange: true,
    tags: ["光模块链", "场内可交易", "AI通信"],
    foundedYears: 4,
    fundCompany: "国泰基金",
    holdingCostSummary: buildHoldingCostSummary(0.29, 0.82, 1.44, 7),
    redemptionFeeFreeAfterDays: 7
  },
  {
    fundId: "cpo-demo-2",
    fundName: "光通信产业精选A",
    fundCode: "018880",
    fundType: "主动基金",
    theme: "CPO光通信",
    themeAliases: ["AI算力基础设施", "通信"],
    trackingTarget: "光模块与高速通信设备组合",
    return1m: 6.9,
    return3m: 13.4,
    return6m: 10.1,
    maxDrawdown: -18.4,
    volatility: 31.8,
    aum: 10.6,
    feeRate: 0.15,
    tradableOnExchange: false,
    tags: ["主动精选", "高弹性", "事件驱动"],
    foundedYears: 2,
    fundCompany: "华夏基金",
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

export const mockFundScores: FundScore[] = [
  {
    fundId: "semiconductor-demo-1",
    fundCode: "012552",
    fundName: "半导体芯片ETF联接A",
    scoreDate: "2026-04-21",
    totalScore: 82,
    state: "observe",
    components: {
      industryOpportunity: 86,
      fundQuality: 78,
      timing: 70,
      riskAdjusted: 66,
      dataConfidence: 72,
      portfolioFit: 76
    },
    reasons: ["半导体行业机会分较高", "主题匹配度清晰", "费用和规模适合继续跟踪"],
    weaknesses: ["短期波动偏高", "需要继续验证回撤控制"],
    riskVetoes: [],
    confidence: "medium",
    nextAction: "保留观察，等待回撤和成交热度进一步确认。",
    methodology: "Mock strategy score v1; for product-flow demonstration only."
  },
  {
    fundId: "medicine-demo-1",
    fundCode: "014117",
    fundName: "创新药ETF联接A",
    scoreDate: "2026-04-21",
    totalScore: 85,
    state: "staged_buy_candidate",
    components: {
      industryOpportunity: 79,
      fundQuality: 82,
      timing: 80,
      riskAdjusted: 74,
      dataConfidence: 76,
      portfolioFit: 83
    },
    reasons: ["创新药处于估值修复观察区", "主题弹性与组合分散度匹配", "当前未触发主要风险 veto"],
    weaknesses: ["行业政策和商业化兑现仍需复盘", "短期趋势强度还需要持续确认"],
    riskVetoes: [],
    confidence: "medium",
    nextAction: "可生成系统分批买入计划草稿，并进入后续系统复核。",
    methodology: "Mock strategy score v1; no live recommendation or transaction instruction."
  },
  {
    fundId: "qdii-demo-1",
    fundCode: "513100",
    fundName: "纳斯达克100ETF",
    scoreDate: "2026-04-21",
    totalScore: 73,
    state: "hold",
    components: {
      industryOpportunity: 81,
      fundQuality: 80,
      timing: 62,
      riskAdjusted: 58,
      dataConfidence: 74,
      portfolioFit: 60
    },
    reasons: ["全球科技方向仍有配置观察价值", "产品流动性和规模相对稳定"],
    weaknesses: ["QDII 汇率和海外市场波动需要单独控制", "与既有海外科技暴露可能重叠"],
    riskVetoes: ["海外市场波动放大时暂停进入买入计划"],
    confidence: "medium",
    nextAction: "继续观察，不生成买入计划草稿。",
    methodology: "Mock strategy score v1; QDII risk is treated as a review condition."
  },
  {
    fundId: "ai-demo-1",
    fundCode: "589090",
    fundName: "科创AIETF",
    scoreDate: "2026-04-21",
    totalScore: 68,
    state: "avoid",
    components: {
      industryOpportunity: 84,
      fundQuality: 72,
      timing: 48,
      riskAdjusted: 42,
      dataConfidence: 70,
      portfolioFit: 55
    },
    reasons: ["AI 算力方向机会强，但短期热度过高"],
    weaknesses: ["估值和拥挤度风险偏高", "回撤空间尚未充分释放"],
    riskVetoes: ["短期过热", "波动率偏高"],
    confidence: "medium",
    nextAction: "暂不进入买入计划，等待热度降温或回撤后复评。",
    methodology: "Mock strategy score v1; risk vetoes can block staged-buy planning."
  },
  {
    fundId: "gaming-demo-1",
    fundCode: "017560",
    fundName: "游戏传媒ETF联接A",
    scoreDate: "2026-04-21",
    totalScore: 52,
    state: "remove",
    components: {
      industryOpportunity: 57,
      fundQuality: 54,
      timing: 50,
      riskAdjusted: 46,
      dataConfidence: 66,
      portfolioFit: 48
    },
    reasons: ["当前策略证据不足", "相对其他观察项优先级下降"],
    weaknesses: ["内容兑现节奏不稳定", "主题波动与组合适配度偏弱"],
    riskVetoes: ["策略证据不足", "复盘优先级下降"],
    confidence: "low",
    nextAction: "建议从买入观察池移出，仅保留行业层面跟踪。",
    methodology: "Mock strategy score v1; removal means leaving the strategy pool, not a sell instruction."
  }
];

export const mockBuyPlans: BuyPlan[] = [
  {
    planId: "buy-plan-medicine-demo-1",
    fundId: "medicine-demo-1",
    fundCode: "014117",
    fundName: "创新药ETF联接A",
    createdAt: "2026-04-21",
    status: "draft",
    maxPlannedExposurePercent: 8,
    batchCount: 3,
    batches: [
      {
        batchIndex: 1,
        trigger: "策略评分保持 80 分以上，且未触发主要风险 veto。",
        plannedExposurePercent: 2,
        status: "ready_for_system_plan"
      },
      {
        batchIndex: 2,
        trigger: "行业趋势继续确认，组合主题集中度仍低于上限。",
        plannedExposurePercent: 3,
        status: "pending"
      },
      {
        batchIndex: 3,
        trigger: "买入后复盘确认原始假设未破坏。",
        plannedExposurePercent: 3,
        status: "pending"
      }
    ],
    pauseConditions: ["创新药行业趋势转弱", "组合主题集中度超过个人上限", "数据质量降为 snapshot_only"],
    invalidationConditions: ["核心策略假设失效", "风险 veto 持续触发", "基金风格明显偏离观察理由"],
    reviewDate: "2026-05-06",
    notes: "演示用分批买入计划草稿，只用于系统结论和用户手动记录，不执行交易。"
  }
];

export const mockPostBuyReviews: PostBuyReview[] = [
  {
    reviewId: "post-buy-review-medicine-continue",
    fundId: "medicine-demo-1",
    fundCode: "014117",
    fundName: "创新药ETF联接A",
    buyPlanId: "buy-plan-medicine-demo-1",
    reviewDate: "2026-05-08",
    manualBuyDate: "2026-04-24",
    originalThesis: {
      summary: "创新药处于估值修复观察区，分批计划只在策略评分和风险 veto 均通过系统复核后继续。",
      evidence: ["行业估值仍处中低区间", "策略评分保持在 80 分以上", "组合内医药主题集中度低于个人上限"],
      invalidationConditions: ["政策或商业化兑现明显弱于预期", "主题集中度超过上限", "风险 veto 持续出现"]
    },
    actualOutcome: {
      summary: "手动买入后的表现与原始假设基本一致，但仍需要继续观察政策和成交热度。",
      returnSinceManualBuyPercent: 2.4,
      maxDrawdownSinceManualBuyPercent: -3.1,
      thesisStillValid: true,
      evidence: ["回撤未超过计划暂停阈值", "行业事件仍支持估值修复逻辑", "未出现数据质量降级"]
    },
    riskEvents: [
      {
        eventId: "medicine-policy-watch",
        eventDate: "2026-05-03",
        severity: "low",
        category: "other",
        summary: "政策窗口仍需跟踪，暂未形成否定原始假设的证据。",
        riskControl: "下一次复盘继续检查政策和商业化进展，不提高计划暴露上限。"
      }
    ],
    decision: "continue_observe",
    nextAction: "继续观察原计划，后续批次仍需系统结论复核，不自动执行。",
    notes: "Mock 复盘记录，仅用于展示买后假设校验流程。"
  },
  {
    reviewId: "post-buy-review-ai-pause",
    fundId: "ai-demo-1",
    fundCode: "589090",
    fundName: "科创AIETF",
    reviewDate: "2026-05-08",
    manualBuyDate: "2026-04-25",
    originalThesis: {
      summary: "AI 算力方向趋势强，但只允许在热度降温且回撤风险可控时保留小比例观察。",
      evidence: ["行业趋势强度高", "资金关注度高", "产品流动性尚可"],
      invalidationConditions: ["短期过热继续抬升", "波动率明显高于观察阈值", "回撤超过个人承受范围"]
    },
    actualOutcome: {
      summary: "买后波动扩大，过热和回撤风险同时出现，原始假设需要暂停验证。",
      returnSinceManualBuyPercent: -4.8,
      maxDrawdownSinceManualBuyPercent: -8.6,
      thesisStillValid: false,
      evidence: ["短期成交拥挤度继续升高", "回撤接近暂停阈值", "风险 veto 未解除"]
    },
    riskEvents: [
      {
        eventId: "ai-overheat-veto",
        eventDate: "2026-05-02",
        severity: "high",
        category: "overheat",
        summary: "短期热度继续抬升，追高风险不适合继续推进计划。",
        riskControl: "暂停后续计划批次，等待热度降温和波动回落后再复盘。"
      },
      {
        eventId: "ai-drawdown-watch",
        eventDate: "2026-05-07",
        severity: "medium",
        category: "drawdown",
        summary: "买后最大回撤扩大，需要重新确认个人承受范围。",
        riskControl: "不追加暴露，先记录回撤和波动变化。"
      }
    ],
    decision: "pause_buying",
    nextAction: "暂停后续分批计划，仅保留复盘观察，不形成新的买入指令。",
    notes: "用于覆盖风险 veto 阻断后的买后复盘场景。"
  },
  {
    reviewId: "post-buy-review-gaming-remove",
    fundId: "gaming-demo-1",
    fundCode: "017560",
    fundName: "游戏传媒ETF联接A",
    reviewDate: "2026-05-08",
    manualBuyDate: "2026-04-22",
    originalThesis: {
      summary: "游戏传媒作为内容周期修复观察项，只有在业绩兑现和资金趋势同步改善时才保留买入观察资格。",
      evidence: ["内容供给预期改善", "主题资金有阶段性回流", "买入观察比例较低"],
      invalidationConditions: ["内容兑现弱于预期", "主题排名持续下滑", "策略证据不足"]
    },
    actualOutcome: {
      summary: "内容兑现和资金延续性均不足，原始假设被削弱。",
      returnSinceManualBuyPercent: -6.2,
      maxDrawdownSinceManualBuyPercent: -9.4,
      thesisStillValid: false,
      evidence: ["主题相对强度下降", "策略评分跌破观察阈值", "复盘优先级低于其他候选基金"]
    },
    riskEvents: [
      {
        eventId: "gaming-thesis-drift",
        eventDate: "2026-05-05",
        severity: "high",
        category: "thesis_drift",
        summary: "原始内容周期假设未得到继续验证。",
        riskControl: "移出买入观察池，仅保留行业层面的低频跟踪。"
      }
    ],
    decision: "remove_from_pool",
    nextAction: "从买入观察池移出；这不是自动卖出或交易执行建议。",
    notes: "覆盖买后复盘后移出观察池的 Mock 场景。"
  },
  {
    reviewId: "post-buy-review-qdii-revise",
    fundId: "qdii-demo-1",
    fundCode: "513100",
    fundName: "纳斯达克100ETF",
    reviewDate: "2026-05-08",
    manualBuyDate: "2026-04-23",
    originalThesis: {
      summary: "全球科技 QDII 用于海外科技暴露观察，但需要控制汇率、海外市场波动和组合集中度。",
      evidence: ["纳指趋势仍强", "产品规模和流动性较好", "可作为全球科技主题观察样本"],
      invalidationConditions: ["海外市场波动快速放大", "QDII 暴露超过个人上限", "汇率风险成为主要收益来源"]
    },
    actualOutcome: {
      summary: "趋势仍在，但海外科技暴露与组合已有持仓重叠，需要修改计划上限和复盘频率。",
      returnSinceManualBuyPercent: 1.1,
      maxDrawdownSinceManualBuyPercent: -4.3,
      thesisStillValid: true,
      evidence: ["趋势未明显破坏", "组合海外科技集中度接近上限", "汇率波动成为需要单独标记的风险"]
    },
    riskEvents: [
      {
        eventId: "qdii-concentration-watch",
        eventDate: "2026-05-04",
        severity: "medium",
        category: "concentration",
        summary: "海外科技主题在组合中的占比接近个人上限。",
        riskControl: "下调计划暴露上限，并把复盘周期缩短到每周。"
      },
      {
        eventId: "qdii-fx-watch",
        eventDate: "2026-05-06",
        severity: "medium",
        category: "volatility",
        summary: "汇率波动放大，收益解释需要拆分市场和汇率因素。",
        riskControl: "记录汇率影响，不把短期收益直接视为策略验证通过。"
      }
    ],
    decision: "revise_plan",
    nextAction: "修订分批计划草稿的暴露上限和复盘频率，继续系统复核。",
    notes: "覆盖计划修订场景，不包含自动调仓或交易执行。"
  }
];

export const mockAiSourceDocuments: AiSourceDocument[] = [
  {
    schemaVersion: "ai-source-document-v1",
    sourceDocumentId: "mock-doc-cpo-orders-2026-05-06",
    sourceType: "mock",
    sourceName: "Mock authorized announcement digest",
    title: "CPO order visibility improves in sample supply-chain notes",
    publishedAt: "2026-05-06 20:10",
    ingestedAt: "2026-05-06 20:40",
    copyrightBoundary: "mock",
    rawTextStorage: "stored_reference_only"
  },
  {
    schemaVersion: "ai-source-document-v1",
    sourceDocumentId: "mock-doc-cpo-overheat-2026-05-07",
    sourceType: "mock",
    sourceName: "Mock industry risk bulletin",
    title: "Optical communication trading heat keeps rising",
    publishedAt: "2026-05-07 18:20",
    ingestedAt: "2026-05-07 18:45",
    copyrightBoundary: "mock",
    rawTextStorage: "stored_reference_only"
  },
  {
    schemaVersion: "ai-source-document-v1",
    sourceDocumentId: "mock-doc-gaming-report-2026-05-03",
    sourceType: "mock",
    sourceName: "Mock fund report interpretation",
    title: "Gaming media fund report shows weaker content thesis",
    publishedAt: "2026-05-03 16:00",
    ingestedAt: "2026-05-03 16:30",
    copyrightBoundary: "mock",
    rawTextStorage: "stored_reference_only"
  },
  {
    schemaVersion: "ai-source-document-v1",
    sourceDocumentId: "mock-doc-medicine-policy-2026-05-02",
    sourceType: "mock",
    sourceName: "Mock policy event digest",
    title: "Medicine policy language remains supportive but uncertain",
    publishedAt: "2026-05-02 09:30",
    ingestedAt: "2026-05-02 10:10",
    copyrightBoundary: "mock",
    rawTextStorage: "stored_reference_only"
  },
  {
    schemaVersion: "ai-source-document-v1",
    sourceDocumentId: "mock-doc-qdii-manager-2026-04-29",
    sourceType: "mock",
    sourceName: "Mock QDII manager update",
    title: "QDII manager change requires evidence review",
    publishedAt: "2026-04-29 17:20",
    ingestedAt: "2026-04-29 17:45",
    copyrightBoundary: "mock",
    rawTextStorage: "stored_reference_only"
  }
];

export const mockAiEvidenceItems: AiEvidenceItem[] = [
  {
    schemaVersion: "ai-evidence-v1",
    evidenceId: "mock-ai-cpo-support-orders",
    sourceDocumentId: "mock-doc-cpo-orders-2026-05-06",
    sourceType: "mock",
    sourceName: "Mock authorized announcement digest",
    publishedAt: "2026-05-06 20:10",
    ingestedAt: "2026-05-06 20:40",
    relatedFundIds: ["cpo-demo-1", "cpo-demo-2"],
    relatedFundCodes: ["515880", "018880"],
    relatedIndustryIds: ["cpo-optical-communication"],
    eventType: "supportive_announcement",
    displaySummary: "Mock AI evidence: CPO order visibility supports continued thesis review, but does not create plan readiness.",
    extractedFacts: ["Order visibility improved in the sample document.", "Delivery and margin confirmation are still required."],
    impactDirection: "support",
    confidence: "medium",
    uncertainty: "Mock evidence does not include verified real-time order data.",
    riskSignals: [],
    thesisEffect: "Supports the CPO communication-chain thesis as one evidence input.",
    evidenceStatus: "interpreted",
    requiresSystemEvidenceReview: false,
    conflictGroupId: "cpo-demand-2026-05",
    conflictStatus: "supports_existing_thesis",
    sourceFreshness: "fresh",
    modelName: "mock-ai-evidence-model",
    promptVersion: "mock-ai-evidence-v1",
    generatedAt: "2026-05-06 20:45",
    mockOnly: true
  },
  {
    schemaVersion: "ai-evidence-v1",
    evidenceId: "mock-ai-cpo-overheat-risk",
    sourceDocumentId: "mock-doc-cpo-overheat-2026-05-07",
    sourceType: "mock",
    sourceName: "Mock industry risk bulletin",
    publishedAt: "2026-05-07 18:20",
    ingestedAt: "2026-05-07 18:45",
    relatedFundIds: ["cpo-demo-1", "cpo-demo-2"],
    relatedFundCodes: ["515880", "018880"],
    relatedIndustryIds: ["cpo-optical-communication"],
    eventType: "industry_news",
    displaySummary: "Mock AI evidence: optical communication heat and valuation crowding require risk review.",
    extractedFacts: ["Trading heat remains elevated.", "Valuation crowding is visible in the sample risk note."],
    impactDirection: "risk",
    confidence: "medium",
    uncertainty: "Heat indicators are sample-only and need authorized market data confirmation.",
    riskSignals: [{ code: "valuation_overheat", severity: "high", message: "CPO theme heat is above the plan-draft review threshold." }],
    thesisEffect: "Weakens near-term plan readiness even if the long-term thesis remains observable.",
    evidenceStatus: "interpreted",
    requiresSystemEvidenceReview: true,
    conflictGroupId: "cpo-demand-2026-05",
    conflictStatus: "conflicts_with_existing_thesis",
    sourceFreshness: "fresh",
    modelName: "mock-ai-evidence-model",
    promptVersion: "mock-ai-evidence-v1",
    generatedAt: "2026-05-07 18:50",
    mockOnly: true
  },
  {
    schemaVersion: "ai-evidence-v1",
    evidenceId: "mock-ai-gaming-invalidation",
    sourceDocumentId: "mock-doc-gaming-report-2026-05-03",
    sourceType: "mock",
    sourceName: "Mock fund report interpretation",
    publishedAt: "2026-05-03 16:00",
    ingestedAt: "2026-05-03 16:30",
    relatedFundIds: ["gaming-demo-1"],
    relatedFundCodes: ["017560"],
    relatedIndustryIds: ["gaming-media"],
    eventType: "negative_fund_report",
    displaySummary: "Mock AI evidence: gaming media report weakens the original content recovery thesis.",
    extractedFacts: ["Content monetization remains weaker than the original thesis.", "Style exposure drift is visible in the mock report."],
    impactDirection: "invalidation",
    confidence: "medium",
    uncertainty: "The interpretation is mock-only and should be reviewed against the original report before use.",
    riskSignals: [{ code: "thesis_invalidation", severity: "high", message: "Original content-cycle thesis is not supported by the mock report." }],
    thesisEffect: "Invalidates the current gaming media watch thesis unless new evidence appears.",
    evidenceStatus: "interpreted",
    requiresSystemEvidenceReview: true,
    conflictStatus: "conflicts_with_existing_thesis",
    sourceFreshness: "fresh",
    modelName: "mock-ai-evidence-model",
    promptVersion: "mock-ai-evidence-v1",
    generatedAt: "2026-05-03 16:35",
    mockOnly: true
  },
  {
    schemaVersion: "ai-evidence-v1",
    evidenceId: "mock-ai-medicine-policy-mixed",
    sourceDocumentId: "mock-doc-medicine-policy-2026-05-02",
    sourceType: "mock",
    sourceName: "Mock policy event digest",
    publishedAt: "2026-05-02 09:30",
    ingestedAt: "2026-05-02 10:10",
    relatedFundIds: ["medicine-demo-1"],
    relatedFundCodes: ["014117"],
    relatedIndustryIds: ["innovative-medicine"],
    eventType: "supportive_announcement",
    displaySummary: "Mock AI evidence: medicine policy language supports continued recovery review with a tracked reimbursement caveat.",
    extractedFacts: ["Policy language remains supportive.", "Reimbursement details are not complete in the sample."],
    impactDirection: "support",
    confidence: "medium",
    uncertainty: "Policy details are incomplete and may affect future profitability.",
    riskSignals: [{ code: "policy_uncertainty", severity: "low", message: "Policy details remain a follow-up item for the next system review." }],
    thesisEffect: "Supports the medicine recovery thesis as one structured evidence input without changing plan readiness by itself.",
    evidenceStatus: "interpreted",
    requiresSystemEvidenceReview: false,
    conflictGroupId: "medicine-policy-2026-05",
    conflictStatus: "supports_existing_thesis",
    sourceFreshness: "watch",
    modelName: "mock-ai-evidence-model",
    promptVersion: "mock-ai-evidence-v1",
    generatedAt: "2026-05-02 10:15",
    mockOnly: true
  },
  {
    schemaVersion: "ai-evidence-v1",
    evidenceId: "mock-ai-fund-scale-anomaly",
    sourceDocumentId: "mock-doc-gaming-report-2026-05-03",
    sourceType: "mock",
    sourceName: "Mock fund report interpretation",
    publishedAt: "2026-05-03 16:00",
    ingestedAt: "2026-05-03 16:30",
    relatedFundIds: ["gaming-demo-1"],
    relatedFundCodes: ["017560"],
    relatedIndustryIds: ["gaming-media"],
    eventType: "scale_anomaly",
    displaySummary: "Mock AI evidence: fund scale change is abnormal and requires liquidity review.",
    extractedFacts: ["Mock report flags abnormal scale change.", "Liquidity and tracking stability require review."],
    impactDirection: "risk",
    confidence: "medium",
    uncertainty: "Scale anomaly is based on mock report fields only.",
    riskSignals: [{ code: "scale_anomaly", severity: "medium", message: "Fund scale anomaly requires liquidity and stability review." }],
    thesisEffect: "Adds risk pressure to the gaming media observation thesis.",
    evidenceStatus: "interpreted",
    requiresSystemEvidenceReview: true,
    conflictStatus: "none",
    sourceFreshness: "fresh",
    modelName: "mock-ai-evidence-model",
    promptVersion: "mock-ai-evidence-v1",
    generatedAt: "2026-05-03 16:40",
    mockOnly: true
  },
  {
    schemaVersion: "ai-evidence-v1",
    evidenceId: "mock-ai-holding-style-drift",
    sourceDocumentId: "mock-doc-gaming-report-2026-05-03",
    sourceType: "mock",
    sourceName: "Mock fund report interpretation",
    publishedAt: "2026-05-03 16:00",
    ingestedAt: "2026-05-03 16:30",
    relatedFundIds: ["gaming-demo-1"],
    relatedFundCodes: ["017560"],
    relatedIndustryIds: ["gaming-media"],
    eventType: "holding_style_drift",
    displaySummary: "Mock AI evidence: holding style drift weakens the original theme fit.",
    extractedFacts: ["Mock holdings moved away from the original theme.", "Theme purity is lower than the watch thesis assumed."],
    impactDirection: "invalidation",
    confidence: "medium",
    uncertainty: "Holding drift needs confirmation with the official periodic report.",
    riskSignals: [{ code: "style_drift", severity: "high", message: "Holding style drift can invalidate the observation thesis." }],
    thesisEffect: "Weakens or invalidates the original gaming media theme-fit assumption.",
    evidenceStatus: "interpreted",
    requiresSystemEvidenceReview: true,
    conflictStatus: "conflicts_with_existing_thesis",
    sourceFreshness: "fresh",
    modelName: "mock-ai-evidence-model",
    promptVersion: "mock-ai-evidence-v1",
    generatedAt: "2026-05-03 16:45",
    mockOnly: true
  },
  {
    schemaVersion: "ai-evidence-v1",
    evidenceId: "mock-ai-fee-change-watch",
    sourceDocumentId: "mock-doc-qdii-manager-2026-04-29",
    sourceType: "mock",
    sourceName: "Mock QDII manager update",
    publishedAt: "2026-04-29 17:20",
    ingestedAt: "2026-04-29 17:45",
    relatedFundIds: ["qdii-demo-1"],
    relatedFundCodes: ["513100"],
    relatedIndustryIds: ["global-tech"],
    eventType: "fee_change",
    displaySummary: "Mock AI evidence: fee change requires cost review before any plan update.",
    extractedFacts: ["Fee wording changed in the mock source.", "Long-term holding cost impact is not yet quantified."],
    impactDirection: "risk",
    confidence: "medium",
    uncertainty: "Fee impact requires the official fee table before strategy use.",
    riskSignals: [{ code: "fee_change", severity: "medium", message: "Fee change can affect long-term holding cost." }],
    thesisEffect: "Adds a cost-review requirement to the QDII observation thesis.",
    evidenceStatus: "ai_pending_review",
    requiresSystemEvidenceReview: true,
    conflictStatus: "none",
    sourceFreshness: "watch",
    modelName: "mock-ai-evidence-model",
    promptVersion: "mock-ai-evidence-v1",
    generatedAt: "2026-04-29 17:55",
    mockOnly: true
  },
  {
    schemaVersion: "ai-evidence-v1",
    evidenceId: "mock-ai-short-term-noise",
    sourceDocumentId: "mock-doc-cpo-overheat-2026-05-07",
    sourceType: "mock",
    sourceName: "Mock industry risk bulletin",
    publishedAt: "2026-05-07 18:20",
    ingestedAt: "2026-05-07 18:45",
    relatedFundIds: ["cpo-demo-1"],
    relatedFundCodes: ["515880"],
    relatedIndustryIds: ["cpo-optical-communication"],
    eventType: "conflicting_news",
    displaySummary: "Mock AI evidence: short-term news noise should not change the long-term thesis by itself.",
    extractedFacts: ["Short-term headline flow is volatile.", "No confirmed order or earnings change is included."],
    impactDirection: "short_term_noise",
    confidence: "medium",
    uncertainty: "Short-term news flow is noisy and should be separated from thesis evidence.",
    riskSignals: [{ code: "data_quality", severity: "low", message: "Short-term noise requires source separation." }],
    thesisEffect: "Does not strengthen plan readiness and should wait for hard evidence.",
    evidenceStatus: "stale_source",
    requiresSystemEvidenceReview: true,
    conflictGroupId: "cpo-demand-2026-05",
    conflictStatus: "unresolved_conflict",
    sourceFreshness: "stale",
    modelName: "mock-ai-evidence-model",
    promptVersion: "mock-ai-evidence-v1",
    generatedAt: "2026-05-07 18:55",
    mockOnly: true
  },
  {
    schemaVersion: "ai-evidence-v1",
    evidenceId: "mock-ai-qdii-manager-low-confidence",
    sourceDocumentId: "mock-doc-qdii-manager-2026-04-29",
    sourceType: "mock",
    sourceName: "Mock QDII manager update",
    publishedAt: "2026-04-29 17:20",
    ingestedAt: "2026-04-29 17:45",
    relatedFundIds: ["qdii-demo-1"],
    relatedFundCodes: ["513100"],
    relatedIndustryIds: ["global-tech"],
    eventType: "fund_manager_change",
    displaySummary: "Mock AI evidence: QDII manager change is low-confidence and needs source review.",
    extractedFacts: ["Manager-change wording is incomplete in the sample.", "No verified portfolio impact is available."],
    impactDirection: "insufficient_evidence",
    confidence: "low",
    uncertainty: "Source detail is incomplete; treat as pending review only.",
    riskSignals: [{ code: "fund_manager_change", severity: "medium", message: "Potential manager change requires verification." }],
    thesisEffect: "Cannot strengthen or weaken the QDII thesis until the source is reviewed.",
    evidenceStatus: "low_confidence",
    requiresSystemEvidenceReview: true,
    conflictStatus: "none",
    sourceFreshness: "watch",
    modelName: "mock-ai-evidence-model",
    promptVersion: "mock-ai-evidence-v1",
    generatedAt: "2026-04-29 17:50",
    mockOnly: true
  },
  {
    schemaVersion: "ai-evidence-v1",
    evidenceId: "mock-ai-cpo-failed-interpretation",
    sourceDocumentId: "mock-doc-cpo-orders-2026-05-06",
    sourceType: "mock",
    sourceName: "Mock authorized announcement digest",
    publishedAt: "2026-05-06 20:10",
    ingestedAt: "2026-05-06 20:40",
    relatedFundIds: ["cpo-demo-2"],
    relatedFundCodes: ["018880"],
    relatedIndustryIds: ["cpo-optical-communication"],
    eventType: "other",
    displaySummary: "Mock AI evidence: interpretation failed and cannot support the strategy state.",
    extractedFacts: [],
    impactDirection: "insufficient_evidence",
    confidence: "low",
    uncertainty: "Model output was not structured enough for strategy use.",
    riskSignals: [{ code: "data_quality", severity: "medium", message: "AI interpretation failed for a relevant source." }],
    thesisEffect: "Treat the evidence as missing until a valid structured interpretation is available.",
    evidenceStatus: "ai_interpretation_failed",
    requiresSystemEvidenceReview: true,
    conflictStatus: "none",
    sourceFreshness: "fresh",
    modelName: "mock-ai-evidence-model",
    promptVersion: "mock-ai-evidence-v1",
    generatedAt: "2026-05-06 20:50",
    mockOnly: true
  }
];

export const mockIndustryLongTermEvents: IndustryLongTermEvent[] = [
  {
    eventId: "cpo-ai-demand-2026-05-06",
    industryId: "cpo-optical-communication",
    industryName: "CPO光通信",
    eventDate: "2026-05-06",
    publishedAt: "2026-05-06 20:10",
    sourceType: "mock",
    sourceName: "Mock 产业事件池",
    title: "海外 AI 资本开支继续向高速互联和光模块倾斜",
    summary: "样例事件用于模拟云厂商扩容带来的长期通信链需求验证，不代表实时新闻。",
    category: "ai_demand",
    longTermImpact: "long_term_support",
    confidence: "medium",
    freshness: "fresh",
    thesisEffect: "支持 CPO 光通信作为 AI 算力扩张的通信环节继续观察。",
    riskNote: "需要后续订单和交付节奏验证，不能仅凭单条事件提高买入准备度。"
  },
  {
    eventId: "cpo-supply-chain-2026-05-04",
    industryId: "cpo-optical-communication",
    industryName: "CPO光通信",
    eventDate: "2026-05-04",
    publishedAt: "2026-05-04 19:40",
    sourceType: "mock",
    sourceName: "Mock 产业事件池",
    title: "光模块供应链扩产节奏加快",
    summary: "样例事件用于观察供给扩张是否会验证长期景气，也可能带来价格和库存风险。",
    category: "supply_chain",
    longTermImpact: "mixed",
    confidence: "medium",
    freshness: "fresh",
    thesisEffect: "扩产说明需求预期仍在，但需要同时观察毛利率和库存变化。",
    riskNote: "若扩产快于真实需求，可能削弱中期盈利质量。",
    invalidationSignal: "订单未兑现而库存连续上升。"
  },
  {
    eventId: "cpo-capex-2026-04-30",
    industryId: "cpo-optical-communication",
    industryName: "CPO光通信",
    eventDate: "2026-04-30",
    publishedAt: "2026-04-30 21:00",
    sourceType: "mock",
    sourceName: "Mock 产业事件池",
    title: "AI 数据中心资本开支预期维持高位",
    summary: "样例事件用于模拟资本开支周期对光通信链条的中长期支撑。",
    category: "capex_cycle",
    longTermImpact: "long_term_support",
    confidence: "medium",
    freshness: "watch",
    thesisEffect: "资本开支维持高位有助于延长 CPO 与高速光模块需求验证窗口。",
    riskNote: "资本开支预期可能被估值提前反映，需要结合回撤和拥挤度。"
  },
  {
    eventId: "cpo-overheat-2026-05-07",
    industryId: "cpo-optical-communication",
    industryName: "CPO光通信",
    eventDate: "2026-05-07",
    publishedAt: "2026-05-07 18:20",
    sourceType: "mock",
    sourceName: "Mock 产业事件池",
    title: "光通信主题短期成交热度继续抬升",
    summary: "样例事件用于标记主题拥挤和追高风险，不代表长期逻辑已经失效。",
    category: "valuation_overheat",
    longTermImpact: "risk_or_invalidation",
    confidence: "medium",
    freshness: "fresh",
    thesisEffect: "短期热度升高会降低继续推进计划的置信度。",
    riskNote: "需要等待回撤、估值消化或基本面继续验证后再复盘。",
    invalidationSignal: "估值继续扩张但订单和盈利验证不足。"
  },
  {
    eventId: "cpo-overseas-demand-2026-04-24",
    industryId: "cpo-optical-communication",
    industryName: "CPO光通信",
    eventDate: "2026-04-24",
    publishedAt: "2026-04-24 20:30",
    sourceType: "mock",
    sourceName: "Mock 产业事件池",
    title: "海外客户需求节奏仍需等待财报验证",
    summary: "样例事件用于表达海外需求的不确定性，避免把产业叙事当作未来表现依据。",
    category: "overseas_demand",
    longTermImpact: "insufficient_evidence",
    confidence: "low",
    freshness: "watch",
    thesisEffect: "海外需求仍是关键变量，但当前证据不足以单独强化长期判断。",
    riskNote: "等待财报、订单和交付数据确认。"
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
  const longTermEvents = mockIndustryLongTermEvents.filter((event) => event.industryId === industryId);
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
    longTermEvents,
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
  "cpo-optical-communication": detailForIndustry(
    "cpo-optical-communication",
    "CPO光通信",
    "AI 算力扩张中的通信链条更受关注，但估值和拥挤度需要同步复盘。",
    "高热观察",
    "CPO 光通信连接 AI 训练/推理集群的高速互联需求，长期逻辑需要持续用资本开支、订单交付、海外需求和盈利质量验证。",
    86,
    84,
    62,
    78,
    [
      { date: "05-04", title: "光模块供应链扩产节奏加快", summary: "扩产说明需求预期仍在，但需要同步观察库存和毛利率。" },
      { date: "05-07", title: "主题成交热度继续抬升", summary: "短期拥挤度上升，适合降低追高冲动并等待基本面验证。" }
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
          : fund.theme === "CPO光通信"
            ? ["中际旭创", "新易盛", "天孚通信"]
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

export type MockWatchlistStrategyScenario = {
  scenarioId: string;
  title: string;
  mockOnly: true;
  fundId: string;
  fundCode: string;
  fundName: string;
  expectedStage: WatchlistStrategyState["stage"];
  inputSummary: {
    evidenceState: string;
    industryContext: string;
    riskContext: string;
    portfolioContext: string;
  };
  state: WatchlistStrategyState;
};

const scoringMissingEvidence: WatchlistStrategyMissingEvidence[] = [
  {
    code: "fetch_failed",
    field: "return3m",
    message: "近 3 月收益同步失败，当前只能看到旧快照。",
    impact: "收益趋势证据不足，状态保持 scoring。",
    suggestedAction: "重试基金快照刷新，或等待下一次授权数据同步。",
    source: "mock_snapshot",
    updatedAt: "2026-04-18"
  },
  {
    code: "source_unavailable",
    field: "industryEventSummary",
    message: "当前 Mock 数据源没有给这只基金映射有效行业事件摘要。",
    impact: "行业 thesis 置信度不能提升到计划草稿要求。",
    suggestedAction: "补充行业映射或接入授权行业事件来源。",
    source: "mock_industry_events"
  },
  {
    code: "stale_data",
    field: "metricTradeDate",
    message: "核心指标日期超过本轮新鲜度窗口。",
    impact: "风险和时机判断需要等待新快照。",
    suggestedAction: "刷新基金指标后重新生成系统策略结论。",
    updatedAt: "2026-04-15"
  },
  {
    code: "manual_needed",
    field: "portfolioContext",
    message: "缺少个人持仓成本和主题暴露上限。",
    impact: "不能确认加入候选是否造成集中度过高。",
    suggestedAction: "在我的持仓中补充成本、持仓金额和主题上限。"
  },
  {
    code: "not_applicable",
    field: "intradayValuation",
    message: "该场景用于 QDII/延迟估值说明，盘中估值不作为主要证据。",
    impact: "需要展示估值日期和延迟原因，而不是按实时价格判断。",
    suggestedAction: "使用带日期的 NAV 或延迟估值字段。"
  }
];

const cpoUserHypothesis: WatchlistStrategyManualAssumptionRef = {
  assumptionId: "user-hypothesis-cpo-orders-2026-05",
  source: "user",
  createdAt: "2026-05-08",
  updatedAt: "2026-05-08",
  hypothesis: "个人假设：CPO 光模块订单如果在两次财报中继续兑现，通信设备 ETF 的长期 thesis 可维持。",
  confidence: "medium",
  appliesWhen: "仅在订单、毛利率和海外需求数据同步改善时适用。",
  invalidationCondition: "若订单未兑现且库存连续上升，该个人假设失效。",
  evidenceRefs: ["cpo-ai-demand-2026-05-06", "cpo-supply-chain-2026-05-04"]
};

function buildMockBacktestSeries(startDate: string, returns: number[]): WatchlistStrategyBacktestSeriesPoint[] {
  const start = new Date(startDate);
  return returns.map((returnPercent, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      returnPercent
    };
  });
}

const positiveBacktestReturns = Array.from({ length: 360 }, (_, index) => {
  if (index >= 90 && index < 135) return -0.42;
  if (index % 29 === 0) return -0.18;
  if (index % 11 === 0) return 0.36;
  return 0.12;
});

const positiveBenchmarkReturns = Array.from({ length: 360 }, (_, index) => {
  if (index >= 90 && index < 135) return -0.36;
  if (index % 31 === 0) return -0.12;
  return 0.08;
});

const weakBacktestReturns = Array.from({ length: 220 }, (_, index) => {
  if (index >= 55 && index < 95) return -0.62;
  if (index % 17 === 0) return 0.42;
  if (index % 9 === 0) return -0.28;
  return 0.04;
});

const weakBenchmarkReturns = Array.from({ length: 220 }, (_, index) => {
  if (index >= 55 && index < 95) return -0.3;
  if (index % 13 === 0) return 0.16;
  return 0.05;
});

const insufficientBacktestReturns = Array.from({ length: 80 }, (_, index) => {
  if (index >= 25 && index < 38) return -0.85;
  if (index % 10 === 0) return 0.95;
  return 0.1;
});

const insufficientBenchmarkReturns = Array.from({ length: 80 }, (_, index) => {
  if (index >= 25 && index < 38) return -0.35;
  if (index % 12 === 0) return 0.28;
  return 0.05;
});

const positiveBacktestSummary: WatchlistStrategyBacktestSummary = buildWatchlistStrategyBacktestSummary({
  strategyName: "Mock medicine staged review",
  series: buildMockBacktestSeries("2025-01-01", positiveBacktestReturns),
  benchmarkSeries: buildMockBacktestSeries("2025-01-01", positiveBenchmarkReturns),
  benchmark: "Mock innovation medicine industry benchmark",
  feeAssumption: "Mock fee model: 0.35% subscription/redemption and estimated management cost; no real execution simulation.",
  feePercent: 0.35,
  slippagePercent: 0.05,
  parameterCount: 3,
  minSampleSize: 120
});

const weakBacktestSummary: WatchlistStrategyBacktestSummary = buildWatchlistStrategyBacktestSummary({
  strategyName: "Mock gaming thesis review",
  series: buildMockBacktestSeries("2025-09-01", weakBacktestReturns),
  benchmarkSeries: buildMockBacktestSeries("2025-09-01", weakBenchmarkReturns),
  benchmark: "Mock gaming media benchmark",
  feeAssumption: "Mock fee assumption only; real subscription limits and trading impact are not included.",
  feePercent: 0.4,
  slippagePercent: 0.08,
  parameterCount: 7,
  minSampleSize: 120
});

const insufficientBacktestSummary: WatchlistStrategyBacktestSummary = buildWatchlistStrategyBacktestSummary({
  strategyName: "Mock CPO event-driven review",
  series: buildMockBacktestSeries("2026-01-01", insufficientBacktestReturns),
  benchmarkSeries: buildMockBacktestSeries("2026-01-01", insufficientBenchmarkReturns),
  benchmark: "Mock communication equipment benchmark",
  feeAssumption: "Mock fee assumption only; no real subscription restriction or execution slippage model.",
  feePercent: 0.3,
  slippagePercent: 0.05,
  parameterCount: 5,
  minSampleSize: 120
});

export const mockWatchlistStrategyScenarios: MockWatchlistStrategyScenario[] = [
  {
    scenarioId: "watching-semiconductor-base",
    title: "普通观察：半导体候选证据尚需继续跟踪",
    mockOnly: true,
    fundId: "semiconductor-demo-1",
    fundCode: "012552",
    fundName: "半导体芯片ETF联接A",
    expectedStage: "watching",
    inputSummary: {
      evidenceState: "基金质量和行业机会具备观察价值，但时机和回撤控制仍需等待。",
      industryContext: "半导体行业机会增强，尚未形成系统计划草稿结论。",
      riskContext: "无硬风险 veto，短期波动偏高。",
      portfolioContext: "个人组合适配中等，暂不触发集中度阻断。"
    },
    state: {
      stage: "watching",
      strategyScore: 76,
      riskLevel: "medium",
      riskVetoes: [],
      confidence: "medium",
      reason: "Mock-only scenario: semiconductor fund remains worth watching, but timing and drawdown evidence are not strong enough for a system plan draft.",
      nextAction: "继续观察行业验证、基金回撤控制和下一次系统策略刷新。",
      nextReviewDate: "2026-05-20",
      systemConclusionResult: "system_watch_continue",
      updatedAt: "2026-05-11"
    }
  },
  {
    scenarioId: "scoring-cpo-missing-evidence",
    title: "评分中：CPO 候选缺失证据待补齐",
    mockOnly: true,
    fundId: "cpo-demo-2",
    fundCode: "018880",
    fundName: "光通信产业精选A",
    expectedStage: "scoring",
    inputSummary: {
      evidenceState: "CPO 长期事件有支撑，但基金指标、行业映射和持仓约束存在缺口。",
      industryContext: "长期 AI 通信链事件支持观察，但过热事件也存在。",
      riskContext: "暂未形成硬 veto，但数据缺口限制系统结论。",
      portfolioContext: "缺少个人主题暴露上限和成本信息。"
    },
    state: {
      stage: "scoring",
      strategyScore: 64,
      riskLevel: "medium",
      riskVetoes: [],
      confidence: "low",
      reason: "Mock-only scenario: CPO evidence is incomplete; scoring must show concrete missing evidence and next data actions.",
      nextAction: "先补齐缺失数据和个人持仓约束，再重新生成系统策略结论。",
      nextReviewDate: "2026-05-18",
      missingEvidence: scoringMissingEvidence,
      manualAssumptionRefs: [cpoUserHypothesis],
      aiEvidenceRefs: mockAiEvidenceItems.filter((item) => item.relatedFundIds.includes("cpo-demo-2")),
      backtestSummary: insufficientBacktestSummary,
      systemConclusionResult: "system_need_more_evidence",
      updatedAt: "2026-05-11"
    }
  },
  {
    scenarioId: "buy-plan-draft-medicine-ready",
    title: "计划草稿：创新药满足系统草稿前置条件",
    mockOnly: true,
    fundId: "medicine-demo-1",
    fundCode: "014117",
    fundName: "创新药ETF联接A",
    expectedStage: "buy_plan_draft",
    inputSummary: {
      evidenceState: "基金质量、估值修复逻辑和数据质量均达到草稿生成条件。",
      industryContext: "创新药估值修复逻辑仍成立。",
      riskContext: "未触发硬风险 veto，回撤和波动在计划草稿阈值内。",
      portfolioContext: "个人持仓集中度未超过上限。"
    },
    state: {
      stage: "buy_plan_draft",
      strategyScore: 84,
      riskLevel: "medium",
      riskVetoes: [],
      confidence: "medium",
      reason: "Mock-only scenario: evidence, data quality, and risk checks support a system-generated staged-buy plan draft.",
      nextAction: "生成系统分批买入计划草稿记录；该草稿不代表交易执行。",
      nextReviewDate: "2026-05-20",
      buyPlanDraftId: "buy-plan-medicine-demo-1",
      aiEvidenceRefs: mockAiEvidenceItems.filter((item) => item.relatedFundIds.includes("medicine-demo-1")),
      backtestSummary: positiveBacktestSummary,
      systemConclusionResult: "system_plan_draft_ready",
      updatedAt: "2026-05-11"
    }
  },
  {
    scenarioId: "paused-cpo-overheat-concentration",
    title: "暂停观察：CPO 过热和集中度触发风险阻断",
    mockOnly: true,
    fundId: "cpo-demo-1",
    fundCode: "515880",
    fundName: "通信设备ETF",
    expectedStage: "paused",
    inputSummary: {
      evidenceState: "CPO 长期逻辑仍可研究，但短期热度和组合集中度同步升高。",
      industryContext: "长期事件有支撑，过热事件削弱继续推进条件。",
      riskContext: "短期过热、波动和主题集中度触发风险 veto。",
      portfolioContext: "已有 AI/CPO 暴露接近个人主题上限。"
    },
    state: {
      stage: "paused",
      strategyScore: 71,
      riskLevel: "high",
      riskVetoes: ["CPO 主题短期过热", "个人 AI/CPO 主题集中度超过上限", "波动率偏高"],
      confidence: "medium",
      reason: "Mock-only scenario: long-term CPO thesis remains observable, but risk veto blocks a plan draft.",
      nextAction: "暂停进入分批计划，等待热度回落、估值消化和主题集中度下降后再系统复核。",
      nextReviewDate: "2026-05-18",
      manualAssumptionRefs: [cpoUserHypothesis],
      aiEvidenceRefs: mockAiEvidenceItems.filter((item) => item.relatedFundIds.includes("cpo-demo-1")),
      backtestSummary: insufficientBacktestSummary,
      systemConclusionResult: "system_risk_blocked",
      updatedAt: "2026-05-11"
    }
  },
  {
    scenarioId: "removed-gaming-thesis-invalidated",
    title: "归档：游戏传媒原始策略假设失效",
    mockOnly: true,
    fundId: "gaming-demo-1",
    fundCode: "017560",
    fundName: "游戏传媒ETF联接A",
    expectedStage: "removed",
    inputSummary: {
      evidenceState: "内容兑现和资金延续性均弱于原始假设。",
      industryContext: "主题相对强度下降，行业证据不足以继续支撑基金级计划。",
      riskContext: "策略证据不足和 thesis drift 构成归档依据。",
      portfolioContext: "不再作为个人购买候选池重点对象。"
    },
    state: {
      stage: "removed",
      strategyScore: 46,
      riskLevel: "high",
      riskVetoes: ["原始内容周期假设失效", "策略证据不足", "历史验证偏弱"],
      confidence: "low",
      reason: "Mock-only scenario: explicit thesis invalidation archives the watch item; this is not an automatic sell instruction.",
      nextAction: "从买入观察池归档，只保留复盘记录和行业低频跟踪线索。",
      nextReviewDate: "2026-06-10",
      aiEvidenceRefs: mockAiEvidenceItems.filter((item) => item.relatedFundIds.includes("gaming-demo-1")),
      backtestSummary: weakBacktestSummary,
      systemConclusionResult: "system_risk_blocked",
      updatedAt: "2026-05-11"
    }
  },
  {
    scenarioId: "paused-qdii-delayed-data",
    title: "暂停观察：QDII 延迟数据和海外暴露风险",
    mockOnly: true,
    fundId: "qdii-demo-1",
    fundCode: "513100",
    fundName: "纳斯达克100ETF",
    expectedStage: "paused",
    inputSummary: {
      evidenceState: "产品规模和流动性较好，但估值和收益数据存在延迟。",
      industryContext: "全球科技配置仍可观察。",
      riskContext: "海外市场波动、汇率和 QDII 暴露需要单独控制。",
      portfolioContext: "已有海外科技暴露接近个人上限。"
    },
    state: {
      stage: "paused",
      strategyScore: 69,
      riskLevel: "high",
      riskVetoes: ["QDII 暴露接近个人上限", "海外市场波动放大", "估值数据存在延迟"],
      confidence: "medium",
      reason: "Mock-only scenario: QDII remains observable but delayed data and concentration risk block the plan path.",
      nextAction: "等待带日期的 NAV/估值数据和组合暴露复核后再判断是否恢复观察。",
      nextReviewDate: "2026-05-18",
      missingEvidence: [
        {
          code: "not_applicable",
          field: "intradayValuation",
          message: "QDII 不适合按盘中实时估值作为核心策略证据。",
          impact: "当前估值必须显示日期和延迟原因。",
          suggestedAction: "使用最新可用 NAV、估值日期和延迟说明进行复核。",
          source: "mock_qdii_delay",
          updatedAt: "2026-05-10"
        }
      ],
      aiEvidenceRefs: mockAiEvidenceItems.filter((item) => item.relatedFundIds.includes("qdii-demo-1")),
      systemConclusionResult: "system_risk_blocked",
      updatedAt: "2026-05-11"
    }
  }
];

export const funds = fundPool;
