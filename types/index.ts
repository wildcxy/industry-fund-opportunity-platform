export type ScoreLabel =
  | "机会增强"
  | "趋势确认"
  | "低位关注"
  | "高热观察"
  | "风险偏高";

export type RiskLevel = "低" | "中" | "高";

export type MetricExplain = {
  title: string;
  content: string;
};

export type IndustryOpportunityCard = {
  industryId: string;
  industryName: string;
  opportunityScore: number;
  trendScore: number;
  capitalScore: number;
  valuationScore: number;
  riskLevel: RiskLevel;
  performance5d: number;
  performance20d: number;
  fundCount: number;
  tags: string[];
  summary: string;
  label: ScoreLabel;
  methodology?: MetricExplain;
  updatedAt?: string;
};

export type IndustryTrendStrategy = {
  strategyScore: number;
  signal: string;
  momentumScore: number;
  drawdownControlScore: number;
  volatilityControlScore: number;
  trendQualityScore: number;
  overheatRiskScore: number;
  return20d?: number | null;
  return60d?: number | null;
  return120dProxy?: number | null;
  maxDrawdownProxy?: number | null;
  volatilityProxy?: number | null;
  hint: string;
  riskControlHint: string;
  methodology: string;
};

export type DetailMetric = {
  name: string;
  score: number;
  summary: string;
};

export type TimelineEvent = {
  date: string;
  title: string;
  summary: string;
};

export type ChartPoint = {
  label: string;
  value: number;
};

export type FundFeeRuleSummary = {
  subscriptionFeeRate?: number | null;
  purchaseFeeRate?: number | null;
  managementFeeRate?: number | null;
  custodianFeeRate?: number | null;
  salesServiceFeeRate?: number | null;
  qualityStatus?: string | null;
  feeRuleText?: string | null;
};

export type RedemptionRule = {
  minHoldingDays: number;
  maxHoldingDays?: number | null;
  redemptionFeeRate?: number | null;
  ruleText?: string | null;
  isFreeThreshold?: boolean;
  priorityRank?: number;
};

export type HoldingCostScenario = {
  holdingDays: number;
  totalCostRate?: number | null;
  subscriptionCostRate?: number | null;
  redemptionCostRate?: number | null;
  managementCostRate?: number | null;
  custodianCostRate?: number | null;
  salesServiceCostRate?: number | null;
  isRedemptionFeeFree?: boolean;
  matchedRedemptionRule?: {
    minHoldingDays?: number | null;
    maxHoldingDays?: number | null;
    redemptionFeeRate?: number | null;
    ruleText?: string | null;
    qualityStatus?: string | null;
  } | null;
  methodology?: {
    version?: string;
    disclaimer?: string;
    holdingDays?: number;
    qualityStatus?: string | null;
    annualFeeProration?: string;
  } | null;
};

export type FundListItem = {
  fundId: string;
  fundName: string;
  fundCode: string;
  fundType: "ETF" | "联接基金" | "主动基金" | "QDII";
  theme: string;
  themeAliases?: string[];
  trackingTarget: string;
  return1d?: number | null;
  return1m: number;
  return3m: number;
  return6m: number;
  maxDrawdown: number;
  volatility: number;
  aum: number;
  latestNav?: number | null;
  previousNav?: number | null;
  latestNavDate?: string | null;
  previousNavDate?: string | null;
  metricTradeDate?: string | null;
  metricUpdatedAt?: string | null;
  metricDataVersion?: string | null;
  feeRate: number;
  tradableOnExchange: boolean;
  tags: string[];
  foundedYears?: number;
  fundCompany?: string;
  feeRuleSummary?: FundFeeRuleSummary | null;
  holdingCostSummary?: HoldingCostScenario[];
  redemptionFeeFreeAfterDays?: number | null;
  dataSource?: "真实快照" | "演示样例" | "待采集" | "采集中" | "采集失败" | "费用待补充";
  dataCompleteness?: "complete" | "partial" | "pending" | "failed";
  missingMetrics?: string[];
  rankingScore?: number;
  rankingSignal?: string;
};

export type FundCandidateStatus =
  | "not_added"
  | "pending"
  | "collecting"
  | "ready"
  | "failed"
  | "backend_unavailable";

export type FundSearchResult = {
  fundCode: string;
  fundName: string;
  fundType?: string | null;
  fundCompany?: string | null;
  sourceName: "akshare" | string;
  isAdded: boolean;
  candidateStatus?: FundCandidateStatus | null;
  taskStatus?: FundCandidateStatus | null;
  lastSuccessTradeDate?: string | null;
  lastErrorMessage?: string | null;
};

export type FundCollectionStatus = {
  fundId?: string;
  fundCode: string;
  fundName?: string;
  candidateStatus: FundCandidateStatus;
  taskStatus?: FundCandidateStatus | null;
  attemptCount?: number;
  lastSuccessTradeDate?: string | null;
  lastErrorMessage?: string | null;
};

export type IndustryDetailSnapshot = {
  industryId: string;
  industryName: string;
  headline: string;
  opportunityLabel: ScoreLabel;
  thesisSummary: string;
  trendMetrics: DetailMetric[];
  capitalMetrics: DetailMetric[];
  valuationMetrics: DetailMetric[];
  riskMetrics: DetailMetric[];
  timelineEvents: TimelineEvent[];
  chartSeries: ChartPoint[];
  relatedFunds: FundListItem[];
  disclaimer: string;
};

export type FundCompareItem = {
  fundId: string;
  fundName: string;
  fundCode: string;
  returnMetrics: {
    day1?: number;
    month1: number;
    month3: number;
    month6: number;
    latestNav?: number;
    previousNav?: number;
  };
  riskMetrics: {
    maxDrawdown: number;
    volatility: number;
  };
  feeRate: number;
  aum: number;
  inceptionDate: string;
  topHoldings: string[];
  concentration: string;
  trackingDeviationNote: string;
  feeRule?: FundFeeRuleSummary | null;
  redemptionRules?: RedemptionRule[];
  holdingCostSummary?: HoldingCostScenario[];
};

export type FundHoldingItem = {
  holdingName: string;
  holdingCode?: string | null;
  holdingType: string;
  weightPercent?: number | null;
  reportPeriod: string;
  reportDate?: string | null;
  discloseDate?: string | null;
  sourceName: string;
  dataQuality: string;
};

export type FundRebalanceInference = {
  direction: "possible_add" | "possible_reduce_or_pressure" | "stable_or_unclear" | "insufficient_data" | string;
  label: string;
  confidence: number;
  evidence: string;
};

export type FundHoldingView = {
  status: string;
  sourceQuality: "official_disclosure" | "name_only" | "awaiting_disclosure" | string;
  holdingFreshness?: {
    label: string;
    summary: string;
    stalenessDays?: number | null;
  };
  holdings: FundHoldingItem[];
  rebalanceInference: FundRebalanceInference[];
  disclaimer: string;
};

export type PortfolioPosition = {
  positionId: string;
  fundCode?: string;
  fundName: string;
  units?: number;
  costNav?: number;
  marketValueSnapshot?: number;
  dayProfitSnapshot?: number;
  holdingProfitSnapshot?: number;
  holdingReturnSnapshot?: number;
  source?: "manual_nav" | "alipay_screenshot" | "manual_snapshot" | string;
  createdAt: string;
  updatedAt?: string;
};

export type PortfolioDecisionValuation = {
  valuationId: string;
  tradeDate: string;
  totalMarketValue?: number | null;
  totalCostValue?: number | null;
  totalDayProfit?: number | null;
  totalHoldingProfit?: number | null;
  holdingCount: number;
  enhancedCount: number;
  quality?: {
    enhancedCount?: number;
    partialCount?: number;
    snapshotOnlyCount?: number;
    enhancedRatio?: number;
  };
  updatedAt?: string | null;
};

export type PortfolioDecisionTip = {
  tipId: string;
  tipType: string;
  severity: "low" | "medium" | "high" | string;
  title: string;
  summary: string;
  evidence?: Record<string, unknown>;
  dataQuality: string;
  riskDisclaimer: string;
};

export type PortfolioCandidateFund = {
  candidateId: string;
  fundId: string;
  fundCode: string;
  fundName: string;
  sourceType: string;
  reason: string;
  metrics: {
    theme?: string;
    fundType?: string;
    return1d?: number | null;
    return3m?: number | null;
    maxDrawdown?: number | null;
    volatility?: number | null;
    aum?: number | null;
  };
  dataQuality: string;
  riskDisclaimer: string;
};

export type PortfolioDecisionAssistView = {
  valuation?: PortfolioDecisionValuation | null;
  positions?: Array<{
    positionId: string;
    fundCode?: string | null;
    fundName: string;
    theme?: string | null;
    fundType?: string | null;
    latestNav?: number | null;
    previousNav?: number | null;
    return1d?: number | null;
    marketValue?: number | null;
    costValue?: number | null;
    dayProfit?: number | null;
    holdingProfit?: number | null;
    holdingReturn?: number | null;
    dataMode: "nav" | "snapshot" | string;
    dataQuality: "enhanced" | "partial" | "partial_nav" | "snapshot_only" | string;
  }>;
  diagnosis?: {
    themeExposure?: Array<{ theme: string; marketValue: number; ratio: number }>;
    fundTypeExposure?: Array<{ fundType: string; marketValue: number; ratio: number }>;
    decisionThemeExposure?: Array<{ theme: string; marketValue: number; ratio: number }>;
    qdiiRatio?: number;
    largestPosition?: { fundName: string; fundCode?: string | null; ratio: number } | null;
    longHoldReview?: PortfolioStrategyReviewItem[];
    highBetaReview?: PortfolioStrategyReviewItem[];
    trendWatchList?: PortfolioStrategyReviewItem[];
    industryEvidence?: PortfolioIndustryEvidence[];
    decisionMethodology?: {
      version?: string;
      summary?: string;
      levels?: Record<string, string>;
    };
    dataQuality?: Record<string, unknown>;
  } | null;
  tips?: PortfolioDecisionTip[];
  candidates?: PortfolioCandidateFund[];
  disclaimer?: string;
};

export type PortfolioStrategyReviewItem = {
  fundCode?: string | null;
  fundName: string;
  theme?: string | null;
  decisionTheme?: string | null;
  assetStyle?: string | null;
  assetIntent?: string | null;
  marketValue?: number | null;
  positionRatio?: number | null;
  return1d?: number | null;
  return1m?: number | null;
  return3m?: number | null;
  maxDrawdown?: number | null;
  volatility?: number | null;
  trendLabel?: string;
  decisionLevel?: string;
  decisionScore?: number | null;
  confidence?: string;
  operationSignal?: string;
  signalStrength?: "low" | "medium" | "high" | string;
  buyWatchScore?: number | null;
  operationReason?: string;
  operationDisclaimer?: string;
  evidenceSummary?: string[];
  missingEvidence?: string[];
  industryContext?: PortfolioIndustryEvidence | null;
  action?: string;
};

export type PortfolioIndustryEvidence = {
  industryId?: string;
  industryName?: string;
  performance5d?: number | null;
  performance20d?: number | null;
  performance60d?: number | null;
  trendScore?: number | null;
  capitalScore?: number | null;
  valuationScore?: number | null;
  riskScore?: number | null;
  riskLevel?: string | null;
  opportunityScore?: number | null;
  label?: string | null;
  summary?: string | null;
  evidenceStatus?: string;
};

export type WatchlistItem = {
  itemId: string;
  itemType: "industry" | "fund";
  fundCode?: string | null;
  displayName: string;
  statusLabel: string;
  latestChange: string;
  updatedAt: string;
  entryLink: string;
};

export type IndustryHomepageView = IndustryOpportunityCard & {
  relatedFunds: FundListItem[];
  focusReason: string;
  trendStrategy?: IndustryTrendStrategy;
};

export type HomepageMarketOverview = {
  summary: string;
  strongTrendCount: number;
  lowPositionCount: number;
};

export type GlobalFundPick = FundListItem & {
  observationScore: number;
  actionLabel: string;
  reason: string;
  riskNote: string;
  isHeld?: boolean;
  marketValueSnapshot?: number;
  holdingReturnSnapshot?: number;
};

export type HomepageGlobalFundPicks = {
  title: string;
  methodology: string;
  items: GlobalFundPick[];
};

export type HomepageViewData = {
  industries: IndustryHomepageView[];
  marketOverview: HomepageMarketOverview;
  globalFundPicks?: HomepageGlobalFundPicks;
  updatedAt?: string;
};

export type IndustryDetailView = IndustryDetailSnapshot & {
  conclusionCards: Array<{
    title: string;
    value: string;
    summary: string;
  }>;
  methodologyNotes: MetricExplain[];
  capitalHeatSeries: ChartPoint[];
  trendStrategy?: IndustryTrendStrategy;
};

export type SortKey = "return1d" | "return3m" | "return1m" | "aum" | "feeRate" | "maxDrawdown";
export type ViewMode = "table" | "card";
export type FundTypeFilter = "全部" | FundListItem["fundType"];

export type FundDiscoveryQueryState = {
  theme: string;
  fundType: FundTypeFilter;
  sortKey: SortKey;
  viewMode: ViewMode;
  exchangeOnly: boolean;
  feeBand: "全部" | "低费率" | "中费率" | "高费率";
  aumBand: "全部" | "10亿以下" | "10-50亿" | "50亿以上";
  ageBand: "全部" | "3年以内" | "3-5年" | "5年以上";
  volatilityBand: "全部" | "低波动" | "中波动" | "高波动";
  fundCompany: string;
};

export type WatchlistViewSection = {
  title: string;
  description: string;
  items: WatchlistItem[];
};
