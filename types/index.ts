export type ScoreLabel =
  | "机会增强"
  | "趋势确认"
  | "低位关注"
  | "高热观察"
  | "风险偏高";

export type RiskLevel = "低" | "中" | "高";

export type PortfolioValuationStatus = "fresh" | "refreshing" | "stale" | "failed" | "unavailable" | "delayed";

export type PortfolioValuationDataSource = "backend_cache" | "authorized_api" | "manual_import" | "mock" | "unavailable";

export type PortfolioValuationSnapshot = {
  snapshotId: string;
  fundId: string;
  fundCode?: string;
  fundName: string;
  holdingId?: string;
  positionAmount?: number | null;
  positionShare?: number | null;
  holdingCostAmount?: number | null;
  costNav?: number | null;
  latestEstimatedNav?: number | null;
  latestEstimatedPrice?: number | null;
  valuationDate?: string;
  currentEstimatedValue?: number | null;
  estimatedProfit?: number | null; // Today's estimated profit/loss, not cumulative holding profit.
  estimatedProfitPercent?: number | null; // Today's estimated return percent.
  valuationUpdatedAt: string;
  valuationStatus: PortfolioValuationStatus;
  dataSource: PortfolioValuationDataSource;
  delayReason?: string;
  staleReason?: string;
  errorMessage?: string;
  isRealtime: false;
};

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

export type IndustryEventSourceType = "authorized_api" | "manual_import" | "internal_tag" | "mock";

export type IndustryEventCategory =
  | "ai_demand"
  | "supply_chain"
  | "capex_cycle"
  | "overseas_demand"
  | "valuation_overheat"
  | "policy"
  | "earnings"
  | "short_term_noise"
  | "other";

export type IndustryEventImpactLabel =
  | "long_term_support"
  | "risk_or_invalidation"
  | "short_term_noise"
  | "mixed"
  | "insufficient_evidence";

export type IndustryLongTermEvent = {
  eventId: string;
  industryId: string;
  industryName: string;
  eventDate: string;
  publishedAt: string;
  sourceType: IndustryEventSourceType;
  sourceName: string;
  sourceUrl?: string;
  title: string;
  summary: string;
  category: IndustryEventCategory;
  longTermImpact: IndustryEventImpactLabel;
  confidence: StrategyConfidence;
  freshness: "fresh" | "watch" | "stale";
  thesisEffect: string;
  riskNote: string;
  invalidationSignal?: string;
};

export type IndustryEventImpactSummary = {
  industryId: string;
  asOfDate: string;
  supportCount: number;
  riskCount: number;
  shortTermNoiseCount: number;
  confidence: StrategyConfidence;
  impactDirection: IndustryEventImpactLabel;
  supportingEvidence: string[];
  weakeningEvidence: string[];
  invalidationConditions: string[];
  riskControlHint: string;
  methodology: string;
};

export type IndustryEventMeta = {
  eventCount: number;
  sourceTypes: IndustryEventSourceType[];
  freshness: Array<IndustryLongTermEvent["freshness"]>;
  latestPublishedAt?: string;
  sourceDescription: string;
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
  return1m?: number | null;
  return3m?: number | null;
  return6m?: number | null;
  maxDrawdown?: number | null;
  volatility?: number | null;
  aum?: number | null;
  latestNav?: number | null;
  previousNav?: number | null;
  latestNavDate?: string | null;
  previousNavDate?: string | null;
  metricTradeDate?: string | null;
  metricUpdatedAt?: string | null;
  metricDataVersion?: string | null;
  feeRate?: number | null;
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
  longTermEvents?: IndustryLongTermEvent[];
  eventImpactSummary?: IndustryEventImpactSummary;
  chartSeries: ChartPoint[];
  relatedFunds: FundListItem[];
  disclaimer: string;
};

export type FundCompareItem = {
  fundId: string;
  fundName: string;
  fundCode: string;
  returnMetrics: {
    day1?: number | null;
    month1?: number | null;
    month3?: number | null;
    month6?: number | null;
    latestNav?: number | null;
    previousNav?: number | null;
  };
  riskMetrics: {
    maxDrawdown?: number | null;
    volatility?: number | null;
  };
  feeRate?: number | null;
  aum?: number | null;
  inceptionDate?: string | null;
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
  portfolioRating?: "Buy" | "Overweight" | "Hold" | "Underweight" | "Sell" | string;
  portfolioRatingLabel?: string;
  positionLimit?: number | null;
  riskVetoes?: string[];
  decisionCommittee?: {
    aggressiveCase?: string;
    neutralCase?: string;
    conservativeCase?: string;
    finalView?: string;
  };
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

export type FundScoreState = "observe" | "staged_buy_candidate" | "hold" | "avoid" | "remove";

export type StrategyConfidence = "low" | "medium" | "high";

export type FundScoreComponents = {
  industryOpportunity: number;
  fundQuality: number;
  timing: number;
  riskAdjusted: number;
  dataConfidence: number;
  portfolioFit: number;
};

export type FundScore = {
  fundId: string;
  fundCode?: string;
  fundName: string;
  scoreDate: string;
  totalScore: number;
  state: FundScoreState;
  components: FundScoreComponents;
  reasons: string[];
  weaknesses: string[];
  riskVetoes: string[];
  confidence: StrategyConfidence;
  nextAction: string;
  methodology: string;
};

export type BuyPlanStatus = "draft" | "active" | "paused" | "completed" | "cancelled";

export type BuyPlanBatchStatus = "pending" | "ready_for_system_plan" | "done" | "skipped";

export type BuyPlanBatch = {
  batchIndex: number;
  trigger: string;
  plannedExposurePercent: number;
  status: BuyPlanBatchStatus;
};

export type BuyPlan = {
  planId: string;
  fundId: string;
  fundCode?: string;
  fundName: string;
  createdAt: string;
  status: BuyPlanStatus;
  maxPlannedExposurePercent: number;
  batchCount: number;
  batches: BuyPlanBatch[];
  pauseConditions: string[];
  invalidationConditions: string[];
  reviewDate?: string;
  notes?: string;
};

export type PostBuyReviewDecision = "continue_observe" | "pause_buying" | "remove_from_pool" | "revise_plan";

export type PostBuyReviewRiskEvent = {
  eventId: string;
  eventDate: string;
  severity: "low" | "medium" | "high";
  category: "drawdown" | "volatility" | "concentration" | "data_quality" | "thesis_drift" | "overheat" | "other";
  summary: string;
  riskControl: string;
};

export type PostBuyReview = {
  reviewId: string;
  fundId: string;
  fundCode?: string;
  fundName: string;
  buyPlanId?: string;
  reviewDate: string;
  manualBuyDate?: string;
  originalThesis: {
    summary: string;
    evidence: string[];
    invalidationConditions: string[];
  };
  actualOutcome: {
    summary: string;
    returnSinceManualBuyPercent?: number | null;
    maxDrawdownSinceManualBuyPercent?: number | null;
    thesisStillValid: boolean;
    evidence: string[];
  };
  riskEvents: PostBuyReviewRiskEvent[];
  decision: PostBuyReviewDecision;
  nextAction: string;
  notes?: string;
};

export type RiskAssessmentLevel = "low" | "medium" | "high";

export type RiskDataQuality = "complete" | "partial" | "snapshot_only" | "stale";

export type RiskAssessment = {
  fundId: string;
  fundCode?: string;
  fundName: string;
  riskLevel: RiskAssessmentLevel;
  vetoes: string[];
  warnings: string[];
  pauseConditions: string[];
  invalidationConditions: string[];
  dataQuality: RiskDataQuality;
  nextReviewDate?: string;
};

export type AiEvidenceSourceType = "authorized_api" | "official_announcement" | "fund_report" | "manual_import" | "internal_tag" | "mock";

export type AiEvidenceImpactDirection = "support" | "risk" | "invalidation" | "mixed" | "short_term_noise" | "insufficient_evidence";

export type AiEvidenceStatus = "interpreted" | "ai_pending_review" | "ai_interpretation_failed" | "source_unavailable" | "stale_source" | "low_confidence";

export type AiEvidenceRiskSignalCode =
  | "fund_manager_change"
  | "style_drift"
  | "scale_anomaly"
  | "holding_concentration"
  | "fee_change"
  | "policy_uncertainty"
  | "valuation_overheat"
  | "data_quality"
  | "thesis_invalidation"
  | "other";

export type AiEvidenceRiskSignal = {
  code: AiEvidenceRiskSignalCode;
  severity: "low" | "medium" | "high";
  message: string;
};

export type AiSourceDocument = {
  schemaVersion: "ai-source-document-v1";
  sourceDocumentId: string;
  sourceType: AiEvidenceSourceType;
  sourceName: string;
  sourceUrl?: string;
  title: string;
  publishedAt: string;
  ingestedAt: string;
  contentHash?: string;
  copyrightBoundary: "authorized" | "user_provided" | "internal" | "mock";
  rawTextStorage: "not_stored" | "stored_snapshot" | "stored_reference_only";
};

export type AiEvidenceItem = {
  schemaVersion: "ai-evidence-v1";
  evidenceId: string;
  sourceDocumentId: string;
  sourceType: AiEvidenceSourceType;
  sourceName: string;
  sourceUrl?: string;
  publishedAt: string;
  ingestedAt: string;
  relatedFundIds: string[];
  relatedFundCodes?: string[];
  relatedIndustryIds: string[];
  relatedRecommendationId?: string;
  relatedSystemConclusionId?: string;
  eventType:
    | "supportive_announcement"
    | "negative_fund_report"
    | "policy_uncertainty"
    | "fund_manager_change"
    | "scale_anomaly"
    | "holding_style_drift"
    | "fee_change"
    | "conflicting_news"
    | "industry_news"
    | "other";
  displaySummary: string;
  extractedFacts: string[];
  impactDirection: AiEvidenceImpactDirection;
  confidence: "low" | "medium" | "high";
  uncertainty: string;
  riskSignals: AiEvidenceRiskSignal[];
  thesisEffect: string;
  evidenceStatus: AiEvidenceStatus;
  requiresSystemEvidenceReview: boolean;
  conflictGroupId?: string;
  conflictStatus?: "none" | "supports_existing_thesis" | "conflicts_with_existing_thesis" | "unresolved_conflict";
  sourceFreshness: "fresh" | "watch" | "stale";
  modelName?: string;
  promptVersion?: string;
  generatedAt?: string;
  mockOnly?: boolean;
};

export type WatchlistStrategyStage = "watching" | "scoring" | "buy_plan_draft" | "paused" | "removed";

export type WatchlistStrategyRiskLevel = "low" | "medium" | "high";

export type WatchlistStrategyConfidence = StrategyConfidence;

export type WatchlistMissingEvidenceReason =
  | "fetch_failed"
  | "source_unavailable"
  | "stale_data"
  | "manual_needed"
  | "not_applicable";

export type WatchlistStrategyMissingEvidence = {
  code: WatchlistMissingEvidenceReason;
  field: string;
  message: string;
  impact: string;
  suggestedAction: string;
  source?: string;
  updatedAt?: string;
};

export type ManualStrategyAssumptionTargetType = "fund" | "industry";

export type ManualStrategyAssumption = {
  assumptionId: string;
  source: "user";
  targetType: ManualStrategyAssumptionTargetType;
  fundId?: string;
  fundCode?: string;
  fundName?: string;
  industryId?: string;
  industryName?: string;
  thesisTitle: string;
  hypothesis: string;
  evidenceSourceNote: string;
  confidence: StrategyConfidence;
  invalidationCondition: string;
  nextReviewDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type WatchlistStrategyManualAssumptionRef = {
  assumptionId: string;
  source: "user";
  targetType?: ManualStrategyAssumptionTargetType;
  fundId?: string;
  fundCode?: string;
  industryId?: string;
  thesisTitle?: string;
  evidenceSourceNote?: string;
  nextReviewDate?: string;
  createdAt?: string;
  updatedAt?: string;
  hypothesis: string;
  confidence: StrategyConfidence;
  appliesWhen?: string;
  invalidationCondition: string;
  evidenceRefs?: string[];
};

export type WatchlistStrategyBacktestSummary = {
  sampleStartDate: string;
  sampleEndDate: string;
  benchmark: string;
  feeAssumption: string;
  returnPercent?: number | null;
  benchmarkReturnPercent?: number | null;
  excessReturnPercent?: number | null;
  maxDrawdownPercent?: number | null;
  volatilityPercent?: number | null;
  winPeriods?: number | null;
  lossPeriods?: number | null;
  sampleSize?: number | null;
  overfitRisk: "low" | "medium" | "high";
  limitations: string[];
  conclusion: string;
  methodology?: string;
};

export type WatchlistStrategyBacktestSeriesPoint = {
  date: string;
  nav?: number | null;
  returnPercent?: number | null;
};

export type BuildWatchlistStrategyBacktestSummaryInput = {
  strategyName?: string;
  series: WatchlistStrategyBacktestSeriesPoint[];
  benchmarkSeries?: WatchlistStrategyBacktestSeriesPoint[];
  benchmark: string;
  feeAssumption: string;
  feePercent?: number | null;
  slippagePercent?: number | null;
  minSampleSize?: number;
  parameterCount?: number;
  periodsPerYear?: number;
  asOfDate?: string;
};

export type SystemStrategyConclusionResult =
  | "system_plan_draft_ready"
  | "system_watch_continue"
  | "system_risk_blocked"
  | "system_need_more_evidence";

export type SystemStrategyConclusionRuleCheck = {
  ruleId: string;
  label: string;
  passed: boolean;
  message: string;
};

export type SystemStrategyConclusion = {
  conclusionId: string;
  fundId: string;
  fundCode?: string;
  fundName: string;
  relatedRecommendationId?: string;
  relatedAiEvidenceIds: string[];
  relatedRiskAssessmentId?: string;
  relatedPortfolioValuationId?: string;
  relatedBuyPlanDraftId?: string;
  conclusionTime: string;
  conclusionResult: SystemStrategyConclusionResult;
  recommendationReason: string;
  coreEvidence: string[];
  triggeredRules: SystemStrategyConclusionRuleCheck[];
  riskVetoes: string[];
  dataQuality: RiskDataQuality;
  valuationStatus?: PortfolioValuationStatus;
  estimatedValue?: number | null;
  estimatedProfit?: number | null;
  valuationUpdatedAt?: string;
  portfolioConcentrationSummary?: string;
  planLimitSummary?: string;
  pauseConditions: string[];
  invalidationConditions: string[];
  dataSnapshotSummary: string;
  nextSystemReviewDate?: string;
  note?: string;
};

export type WatchlistStrategyState = {
  stage: WatchlistStrategyStage;
  strategyScore?: number | null;
  riskLevel?: WatchlistStrategyRiskLevel | null;
  riskVetoes?: string[];
  nextAction?: string;
  nextReviewDate?: string;
  buyPlanDraftId?: string;
  reason?: string;
  confidence?: WatchlistStrategyConfidence;
  missingEvidence?: WatchlistStrategyMissingEvidence[];
  manualAssumptionRefs?: WatchlistStrategyManualAssumptionRef[];
  backtestSummary?: WatchlistStrategyBacktestSummary;
  aiEvidenceRefs?: AiEvidenceItem[];
  systemConclusionResult?: SystemStrategyConclusionResult;
  systemConclusion?: SystemStrategyConclusion;
  updatedAt?: string;
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
  strategyState?: WatchlistStrategyState;
  industryEventSummary?: IndustryEventImpactSummary;
  industryEventMeta?: IndustryEventMeta;
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
  decisionTiming?: {
    decisionStage: string;
    buyReadinessScore: number;
    nextAction: string;
    buyTrigger: string;
    sellTrigger: string;
    positionAdvice: string;
    confidence: "low" | "medium" | "high" | string;
    positionRatio?: number;
    positionLimit?: number;
    checklist: string[];
  };
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
