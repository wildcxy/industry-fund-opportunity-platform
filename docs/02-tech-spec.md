# 技术规格文档

## 1. 架构目标

当前项目已经具备较完整的基金研究与个人持仓辅助链路。后续 AI 证据判读、策略评分、风险控制、系统策略结论、持仓当前估值、买入观察池、分批买入计划、买入后复盘，必须作为“升级层”接入现有模块，而不是重写现有页面或替换已有功能。

现有主链路：

`首页 -> 行业详情 -> 基金发现 -> 基金详情 -> 基金对比 -> 我的观察 -> 我的持仓 -> 持仓决策辅助`

升级后链路：

`已有主链路 -> AI 证据判读 -> 策略评分 -> 风险 veto -> 系统策略结论 -> 分批买入计划草稿 -> 买入后复盘`

架构原则：

- 保持 Next.js + TypeScript + Tailwind CSS。
- 保持已有页面和功能不变，新增能力优先作为数据结构、Mock 场景、lib 计算层和现有页面中的增量展示。
- 不新增交易能力，不接券商账户，不自动下单。
- AI 大模型只作为公告、新闻、报告和事件的证据判读层，不直接生成最终推荐或交易动作。
- 我的持仓支持已持仓基金轻量估值刷新，目标约 1 分钟一次，不做全市场实时行情。
- 不输出“必买”“满仓”“稳赚”等无依据结论。

## 2. 已有模块职责基线

### `app/`

当前职责：

- 管理 Next.js App Router 页面。
- 已有页面包括首页、行业详情、基金发现、基金详情、基金对比、我的观察、我的持仓。
- 管理本地 API Routes，用于代理后端、读取快照、提供 fallback 或功能接口。

升级约束：

- 不为了策略评分新增独立页面，除非后续明确立项。
- 策略评分、买入观察池和分批买入计划应优先嵌入现有页面或现有模块。
- 页面层只负责装配，不应承载复杂评分和风险规则。
- 页面层不得直接调用大模型或拼接 prompt；AI 证据通过后端/API/Mock 快照进入页面模型。

### `components/`

当前职责：

- 管理跨页面共享 UI。
- 包括顶部导航、风险提示、空状态、评分标签、热力图、趋势条、观察面板、存储操作按钮等。

升级约束：

- 可新增或扩展展示型组件，用于呈现策略分、风险 veto、计划状态。
- 可新增或扩展展示型组件，用于呈现 AI 证据摘要、来源、置信度、不确定性和系统策略结论。
- 持仓表需要新增当前估值和预估收益两栏，并展示估值更新时间和异常状态。
- 不在组件中硬编码策略结论。
- 组件只接收计算结果，不负责评分计算。

### `features/`

当前职责：

- 管理重交互业务模块。
- 已有 `funds`、`industries`、`portfolio` 三类功能域。
- `portfolio` 已承载我的持仓、截图导入、持仓同步、组合决策辅助等能力。

升级约束：

- 策略评分优先挂接到已有 `funds`、`portfolio`、`watchlist` 相关界面。
- 不默认新增 `features/strategy` 页面级重模块；只有当多个页面重复使用复杂交互时，再小步抽出。
- 我的持仓模块是策略升级的重要输入，不应被视为旁支功能。

### `lib/`

当前职责：

- 管理数据适配、格式化、本地存储、后端代理、基金别名、基金复盘等工具。
- `lib/adapters` 已承担后端快照与 Mock fallback 到 UI 模型的转换。

升级约束：

- 策略评分计算建议放在 `lib/strategy`。
- 风险评估建议放在 `lib/risk`。
- AI 证据标准化和判读结果适配建议放在 `lib/strategy`、`lib/adapters` 或后端快照 adapter，前端只消费结构化结果。
- 买入计划草稿生成建议放在 `lib/strategy` 或独立小 helper。
- 所有计算函数应尽量纯函数化，输入数据明确，输出可测试。

### `mock/`

当前职责：

- 管理演示数据和 fallback 数据。
- 支撑首页、行业、基金、对比、观察等现有演示链路。

升级约束：

- 新增策略评分、风险状态、观察池状态、买入计划、买入后复盘示例时，优先通过 Mock 数据验证产品链路。
- Mock 数据必须明确是演示或样例，不应被描述成真实推荐。

### `types/`

当前职责：

- 管理核心 TypeScript 数据契约。
- 已覆盖行业、基金、对比、观察、持仓、组合决策辅助等模型。

升级约束：

- 策略评分、风险评估、买入观察池、买入计划、复盘记录必须先定义共享类型，再进入 UI 或 Mock。
- AI 证据判读、系统策略结论记录必须先定义共享类型，再进入 UI 或 Mock。
- 系统策略结论、持仓估值快照必须先定义共享类型，再进入 UI 或 Mock。
- 避免在页面或组件内部重复定义相同结构。

## 3. 升级层设计

### 3.0 AI Evidence Layer

目标：

- 将基金公告、基金定期报告、基金经理变更、规模异常、持仓变化、费率变化、行业新闻、政策事件和产业链事件转成结构化证据。
- 为策略评分和风险 veto 提供可追溯输入。
- 不直接输出最终推荐状态，不绕过风险 veto。

建议位置：

- 类型：`types/`
- Mock：`mock/`
- 标准化/适配：`lib/adapters` 或 `lib/strategy`
- 后端：未来由数据任务或 API 生成快照
- 展示：优先接入我的观察、基金详情、持仓决策辅助

输入：

- 授权 API。
- 官方公告。
- 基金定期报告。
- 手动导入。
- 内部维护标签。
- Mock 样例。

输出：

- 结构化 AI 证据。
- 事件影响方向。
- 置信度和不确定性。
- 风险信号。
- 对原始推荐理由的影响。
- 是否需要系统补充证据。

边界：

- 不采用非授权网页抓取作为默认输入。
- 不把 AI 输出当作事实本身，必须保留来源和发布时间。
- 不允许 AI 判读直接生成买入计划草稿。

### 3.1 Strategy Layer

目标：

- 在已有行业、基金、对比、观察、持仓数据之上，生成个人策略评分和状态。
- 不替代基金发现和基金对比，只作为候选基金之后的决策辅助层。

建议位置：

- 类型：`types/`
- Mock：`mock/`
- 计算：`lib/strategy`
- 展示：优先复用现有 `features/funds`、`features/portfolio`、`app/watchlist`。

输入：

- 行业机会数据。
- AI 证据判读摘要。
- 基金基础和指标数据。
- 基金对比结果。
- 我的持仓和组合暴露。
- 风险评估结果。
- 数据置信度。

输出：

- `FundScore`
- 策略状态。
- 原因、弱点、风险 veto。
- 下一步动作建议。
- 复盘要求。

#### 3.1.1 Watchlist Strategy State Data Flow

第一版策略状态生成采用本地优先架构，先复用已有观察池和本地存储 helper。后续后端快照可以替换或 hydrate 本地状态，但不能改变观察项加/删逻辑。

数据流：

1. 页面读取当前观察项：`readWatchlistIds()` 读取 `STORAGE_KEYS.watchlist`。
2. 页面构建观察项模型：`buildWatchlistItems(ids, summaryItems)` 把本地观察 id、后端观察摘要和 Mock fallback 合并为 `WatchlistItem[]`。
3. 只对 `itemType === "fund"` 的观察项生成策略状态；行业观察项只保留行业机会和长期事件摘要，不进入分批买入计划逻辑。
4. 生成器读取输入证据：
   - 基金指标：现有基金列表/详情 Mock、后端基金快照或可见基金刷新结果。
   - 行业映射：基金主题、主题别名、行业卡片和相关行业 id。
   - 行业事件摘要：`WatchlistItem.industryEventSummary` 或 `lib/strategy/industry-events` 计算结果。
   - 风险结果：`lib/risk` 输出，或 v1 中由生成器内联调用的轻量风险 adapter。
   - 可选持仓上下文：`readPortfolioPositions()` 读取 `STORAGE_KEYS.portfolio`，用于集中度、重复暴露、单基金上限和持仓后复盘线索。
   - 用户补充策略假设：单独存储的个人研究输入，只通过引用进入生成器。
   - 回测摘要：历史净值/收益、策略规则、基准、费用或滑点假设和风险阈值的校验结果。
5. 生成器输出 `WatchlistStrategyState` 或在 Task 30 中补一个小型 typed extension，最小字段保持兼容：`stage`、`strategyScore`、`riskLevel`、`confidence`、`reason`、`nextAction`、`riskVetoes`、`nextReviewDate`、`updatedAt`。
6. 缺失证据不得返回空状态；必须输出 `stage: "scoring"`，并在扩展字段里记录缺失证据原因、用户可读解释和下一数据动作。
7. 风险 veto 优先级高于高分和回测结果；硬 veto 必须输出 `stage: "paused"` 或系统风险阻断结论。
8. `stage: "buy_plan_draft"` 只能在证据充分、风险可接受、持仓适配通过且系统结论为 `system_plan_draft_ready` 时出现。

#### 3.1.2 State Identity and Persistence Boundary

策略状态不改变观察池成员关系。观察池成员仍由 `STORAGE_KEYS.watchlist` 管理；策略状态单独写入 `STORAGE_KEYS.watchlistStrategyState`。

身份 key 规则：

- 主 key 优先使用 `fundId`，用于 Mock 和已有基金列表项。
- 同一基金必须同时兼容 `fundCode`、`fund:{fundCode}`、`code-{fundCode}`、`user-{fundCode}`，用于真实基金、持仓导入和手动添加场景。
- 写入单只基金状态时调用 `writeWatchlistStrategyState(itemId, state, fundCode)`，由现有 helper 同步写入所有 alias key。
- 批量刷新时调用 `writeWatchlistStrategyStateMap(nextMap)`，但必须先合并现有 stateMap，避免覆盖未参与本次刷新且仍有效的基金状态。
- 读取时使用 `readWatchlistStrategyStateMap()` 或 `readWatchlistStrategyState(itemOrId, fundCode)`；页面列表使用 `mergeWatchlistStrategyStates(items, stateMap)` 合并到 `WatchlistItem.strategyState`。
- `removeWatchlistStrategyState(itemOrId, fundCode)` 只在基金观察项被用户移除时清理策略状态；状态刷新不能调用该函数。

读取页面：

- `app/watchlist/page.tsx` 读取并按 `watching`、`scoring`、`buy_plan_draft`、`paused`、`removed` 分组展示。
- `components/watchlist-panel.tsx` 读取高优先级观察项，用于首页观察摘要。
- `features/funds/fund-discovery-client.tsx` 读取策略状态，在基金发现卡片或表格中展示紧凑说明。
- 后续基金详情页或持仓决策辅助只读同一 stateMap，不重复计算策略状态。

刷新模式：

- 单基金刷新：由基金详情、观察卡片或基金发现入口触发，生成单个 `WatchlistStrategyState`，调用 `writeWatchlistStrategyState` 写入，再重新读取并合并状态。
- 批量刷新：由我的观察页触发，仅遍历当前观察池中的基金项，生成 stateMap 增量，调用 `writeWatchlistStrategyStateMap` 写入，再调用 `mergeWatchlistStrategyStates` 让状态分组立即更新。
- 刷新不能新增或移除 `STORAGE_KEYS.watchlist` 里的观察 id，也不能把持仓基金自动加入观察池；持仓 fallback 只作为页面展示和风险上下文。
- 后端未来可提供策略状态快照，前端 adapter 负责映射为同一 `WatchlistStrategyState` shape，再按相同 key 规则 hydrate 本地 stateMap。

#### 3.1.3 Missing Evidence, Manual Inputs, and Backtest Boundary

缺失证据字段至少包含：

- `code`：`fetch_failed`、`source_unavailable`、`stale_data`、`manual_needed`、`not_applicable`。
- `field`：缺失或不可用的指标名，例如 `maxDrawdown`、`industryEventSummary`、`portfolioExposure`、`latestEstimatedNav`。
- `message`：用户可读解释。
- `impact`：对评分、风险、系统结论或计划草稿的影响。
- `suggestedAction`：重试、等待来源、接入授权数据、用户手动补充或使用替代指标。
- `source` 和 `updatedAt`：如有旧数据或失败来源，必须保留来源和时间。

用户补充策略假设必须与生成状态分开存储。建议字段：

- `assumptionId`
- `fundId` / `fundCode`
- `source: "user"`
- `createdAt` / `updatedAt`
- `hypothesis`
- `confidence`
- `appliesWhen`
- `invalidationCondition`
- `evidenceRefs`

生成器只能引用用户假设并降低或提高解释置信度，不能让用户假设绕过风险 veto，也不能单独生成 `buy_plan_draft`。

回测输入边界：

- 历史 NAV 或收益序列。
- 策略规则和触发条件。
- 对照基准。
- 申购、赎回、管理费、托管费、销售服务费或滑点假设。
- 最大回撤、波动、胜率、样本长度、数据缺口和风险阈值。

回测输出只能作为历史验证证据和不确定性提示。没有样本区间、基准、费用假设和最大回撤披露的回测，不得进入策略状态展示；任何回测结果都不能单独生成 `buy_plan_draft`。

### 3.2 Risk Layer

目标：

- 在任何买入观察或分批买入计划之前，提供风险拦截。
- 高分基金也可能因为风险 veto 暂停进入买入计划。

建议位置：

- 类型：`types/`
- Mock：`mock/`
- 计算：`lib/risk`
- 展示：可在持仓决策辅助、基金详情、观察池状态中展示。

风险项：

- 最大回撤。
- 波动率。
- 短期过热。
- 数据缺口。
- 数据更新时间。
- 单基金集中度。
- 单主题集中度。
- QDII/海外暴露。
- 与现有持仓重复度。
- 计划仓位超限。
- AI 判读发现高影响负面事件。
- AI 判读置信度低但潜在影响较大。

输出：

- 风险等级。
- veto 列表。
- 暂停条件。
- 作废条件。
- 下次复盘要求。

### 3.3 System Conclusion Layer

目标：

- 在 `buy_plan_draft` 或 `staged_plan_draft` 前增加系统策略结论状态。
- 由系统规则先判定推荐理由、AI 证据、风险 veto、当前估值、预估收益、持仓集中度、计划上限、暂停条件和失效条件。
- 形成可追溯系统结论记录。

建议接入：

- 先定义 `SystemStrategyConclusion` 类型和 Mock。
- 再在我的观察页或持仓决策辅助中展示系统结论面板。
- 系统结论只影响本地计划状态或后端快照状态，不触发交易。

系统结论：

- `system_plan_draft_ready`
- `system_watch_continue`
- `system_risk_blocked`
- `system_need_more_evidence`

### 3.4 Portfolio Valuation Layer

目标：

- 为我的持仓中的基金刷新当前估值和预估收益。
- 刷新频率目标为页面 active 时约 1 分钟一次。
- 估值结果作为持仓监控、风险复核和策略输入，不作为实时交易价格。

建议接入：

- 类型：`types/` 中定义 `PortfolioValuationSnapshot`、状态枚举和刷新响应类型。
- Mock：`mock/` 只提供持仓基金的估值样例，必须标记为 sample/mock。
- API/adapter：优先复用现有 portfolio API 或 backend proxy，先按 held funds 传入 `fundId/fundCode` 列表，再由 adapter 合并到持仓行。
- 展示：`features/portfolio` 持仓表新增当前估值和预估收益两栏。

输出：

- 当前估值。
- 预估收益。
- 估值更新时间。
- 估值状态：fresh、refreshing、stale、failed、unavailable、delayed。

刷新边界：

- 只刷新我的持仓基金，不做全市场估值轮询，不刷新观察池中但未持仓的基金。
- 页面 active 且持仓列表存在时立即触发一次刷新，随后约 60 秒刷新一次；页面卸载或无持仓时停止。
- 同一基金在本地缓存中的 `valuationUpdatedAt` 未超过 freshness window 时可直接复用，避免重复请求。
- 缓存 key 以 `portfolioValuation:{fundCode || fundId}` 为准；缓存值必须包含 `valuationUpdatedAt`、`valuationStatus`、`dataSource` 和原始持仓标识。
- 刷新失败时保留上一条可用快照并把状态降为 `stale` 或 `failed`，不得把缺失值渲染为 0。

计算口径：

- `currentEstimatedValue = positionShare * latestEstimatedNav`，若没有份额但已有持仓金额，可使用 `positionAmount * latestEstimatedNav / costNav` 或后端返回的估算值；缺少必要字段时保持 `null`。
- `estimatedProfit = currentEstimatedValue - holdingCostAmount`。如果成本金额缺失，保持 `null`，不显示 0。
- `estimatedProfitPercent = estimatedProfit / holdingCostAmount * 100`，成本金额缺失或为 0 时保持 `null`。
- QDII、海外市场或净值披露滞后的基金可以使用 `delayed`，必须显示估值日期或 `delayReason`。

状态含义：

- `fresh`：数据在 freshness window 内，可用于持仓监控、风险复核和系统结论输入。
- `refreshing`：正在请求新快照，UI 可继续展示上一条快照并标记刷新中。
- `stale`：有历史快照但已超过 freshness window；可展示但不能支持 `system_plan_draft_ready`。
- `failed`：本次刷新失败；如有历史快照，只能作为过期参考。
- `unavailable`：该基金当前没有估值源或必要持仓字段。
- `delayed`：估值有披露延迟，常见于 QDII 或海外市场，应展示日期/原因。

系统结论接入：

- `PortfolioValuationSnapshot.snapshotId` 可写入 `SystemStrategyConclusion.relatedPortfolioValuationId`。
- `valuationStatus`、`currentEstimatedValue`、`estimatedProfit`、`estimatedProfitPercent` 应进入系统结论的 valuation/profit 规则检查。
- `fresh` 或有明确延迟说明的 `delayed` 才能作为计划草稿前置证据；`refreshing`、`stale`、`failed`、`unavailable` 都必须让系统结论停留在 `system_need_more_evidence` 或 `system_risk_blocked`。
- 当前估值和预估收益只代表个人持仓监控口径，不代表可成交价格，也不触发交易。

### 3.5 Buy Observation Pool Layer

目标：

- 在现有“我的观察”基础上增加状态，而不是替换我的观察页。
- 区分普通观察、策略评分中、可生成买入计划、暂停、移除。

建议接入：

- 先定义类型和 Mock。
- 再在我的观察页或持仓决策辅助中增量展示状态。
- 不新增页面。

状态：

- `watching`
- `scoring`
- `buy_plan_draft`
- `paused`
- `removed`

### 3.6 Buy Plan Layer

目标：

- 基于策略评分和风险结果生成分批买入计划草稿。
- 计划由系统策略结论生成并体现在推荐结论里，只生成草稿和手动记录位，不执行交易。

建议接入：

- 先做 `BuyPlan` 类型和 Mock。
- 再做纯函数草稿生成。
- 最后在已有页面中展示草稿。

必须包含：

- 分批次数。
- 每批触发条件。
- 最大计划仓位或金额。
- 暂停条件。
- 作废条件。
- 复盘日期。
- 关联系统策略结论记录。

### 3.7 Post-Buy Review Layer

目标：

- 将买入后的表现和原始策略假设绑定起来。
- 帮助判断继续观察、暂停后续买入、修订计划或移出观察池。

建议接入：

- 优先与我的持仓和持仓决策辅助模块结合。
- 通过手动记录真实操作，不接真实交易账户。

## 4. 数据结构草案

### `AiEvidenceItem`

```ts
type AiEvidenceItem = {
  evidenceId: string;
  sourceType: "authorized_api" | "official_announcement" | "fund_report" | "manual_import" | "internal_tag" | "mock";
  sourceName: string;
  sourceUrl?: string;
  publishedAt: string;
  ingestedAt: string;
  relatedFundIds: string[];
  relatedIndustryIds: string[];
  title: string;
  extractedFacts: string[];
  eventType:
    | "fund_manager_change"
    | "fund_scale_change"
    | "holding_change"
    | "fee_change"
    | "policy_event"
    | "industry_news"
    | "earnings_or_guidance"
    | "supply_chain"
    | "risk_warning"
    | "other";
  impactDirection: "support" | "risk" | "invalidation" | "mixed" | "short_term_noise" | "insufficient_evidence";
  confidence: "high" | "medium" | "low";
  uncertainty: string;
  riskSignals: string[];
  thesisEffect: string;
  requiresSystemEvidenceReview: boolean;
  modelName?: string;
  promptVersion?: string;
  generatedAt?: string;
};
```

### `SystemStrategyConclusion`

```ts
type SystemStrategyConclusion = {
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
  conclusionResult: "system_plan_draft_ready" | "system_watch_continue" | "system_risk_blocked" | "system_need_more_evidence";
  recommendationReason: string;
  coreEvidence: string[];
  triggeredRules: Array<{
    ruleId: string;
    label: string;
    passed: boolean;
    message: string;
  }>;
  riskVetoes: string[];
  dataQuality: "complete" | "partial" | "snapshot_only" | "stale";
  valuationStatus?: "fresh" | "refreshing" | "stale" | "failed" | "unavailable" | "delayed";
  estimatedValue?: number;
  estimatedProfit?: number;
  valuationUpdatedAt?: string;
  portfolioConcentrationSummary?: string;
  planLimitSummary?: string;
  pauseConditions: string[];
  invalidationConditions: string[];
  note?: string;
  dataSnapshotSummary: string;
  nextSystemReviewDate?: string;
};
```

`SystemStrategyConclusion` is generated by deterministic strategy/risk rules. AI evidence ids, portfolio valuation ids, and plan draft ids are references only; none of those references can create trade execution. A plan draft can be shown as system-ready only when `conclusionResult === "system_plan_draft_ready"` and every blocking rule check has passed.

### `PortfolioValuationSnapshot`

```ts
type PortfolioValuationSnapshot = {
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
  estimatedProfit?: number | null;
  estimatedProfitPercent?: number | null;
  valuationUpdatedAt: string;
  valuationStatus: "fresh" | "refreshing" | "stale" | "failed" | "unavailable" | "delayed";
  dataSource: "backend_cache" | "authorized_api" | "manual_import" | "mock" | "unavailable";
  delayReason?: string;
  staleReason?: string;
  errorMessage?: string;
  isRealtime: false;
};
```

`PortfolioValuationSnapshot` is a held-position snapshot, not a quote stream. `currentEstimatedValue`, `estimatedProfit`, and `estimatedProfitPercent` are nullable; missing data must be rendered as unavailable/pending, never as zero. The first implementation should keep the shape compatible with local Mock data and backend cache responses so Task 45 can add UI columns without introducing a broad market-data service.

### `AiSourceDocument`

```ts
type AiSourceDocument = {
  schemaVersion: "ai-source-document-v1";
  sourceDocumentId: string;
  sourceType:
    | "authorized_api"
    | "official_announcement"
    | "fund_report"
    | "manual_import"
    | "internal_tag"
    | "mock";
  sourceName: string;
  sourceUrl?: string;
  title: string;
  publishedAt: string;
  ingestedAt: string;
  contentHash?: string;
  copyrightBoundary: "authorized" | "user_provided" | "internal" | "mock";
  rawTextStorage: "not_stored" | "stored_snapshot" | "stored_reference_only";
};
```

### `AiEvidenceItemV1`

`AiEvidenceItemV1` is the implementation baseline for Task 39 and later tasks. Earlier `AiEvidenceItem` drafts in this document are retained only as historical context and should not be implemented as a second shape.

```ts
type AiEvidenceImpactDirection = "support" | "risk" | "invalidation" | "mixed" | "short_term_noise" | "insufficient_evidence";

type AiEvidenceStatus =
  | "interpreted"
  | "ai_pending_review"
  | "ai_interpretation_failed"
  | "source_unavailable"
  | "stale_source"
  | "low_confidence";

type AiEvidenceRiskSignal = {
  code:
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
  severity: "low" | "medium" | "high";
  message: string;
};

type AiEvidenceItemV1 = {
  schemaVersion: "ai-evidence-v1";
  evidenceId: string;
  sourceDocumentId: string;
  sourceType: AiSourceDocument["sourceType"];
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
};
```

AI evidence pipeline boundary:

1. Source documents enter only from authorized API, official announcement/report, user manual import, internal tag, or Mock.
2. The raw/source layer creates `AiSourceDocument`. If copyright or authorization is unclear, the document stays out of the evidence pipeline.
3. AI or rule-based interpretation outputs `AiEvidenceItemV1`. Components never call a model or parse prompt text.
4. Evidence adapter groups items by fund, industry, conflict group, freshness, and status.
5. Strategy and risk helpers consume structured fields only: impact direction, confidence, uncertainty, risk signals, thesis effect, freshness, failure state, and review flag.
6. `support` can raise explanation confidence only within a capped range and only when no risk veto is active.
7. `risk`, `invalidation`, high-severity risk signals, stale source, low confidence, interpretation failure, and unresolved conflict degrade safely into warnings, pause conditions, risk veto candidates, or `system_need_more_evidence`.
8. `AiEvidenceItemV1` can reference a recommendation snapshot or system conclusion record, but it cannot create `system_plan_draft_ready` by itself.
9. Frontend renders AI evidence summaries, source links, uncertainty, conflict status, and review state. It must not render raw model free text as a final recommendation.

### `FundScore`

```ts
type FundScore = {
  fundId: string;
  fundCode?: string;
  fundName: string;
  scoreDate: string;
  totalScore: number;
  state: "observe" | "staged_buy_candidate" | "hold" | "avoid" | "remove";
  components: {
    industryOpportunity: number;
    fundQuality: number;
    timing: number;
    riskAdjusted: number;
    dataConfidence: number;
    portfolioFit: number;
  };
  reasons: string[];
  weaknesses: string[];
  riskVetoes: string[];
  aiEvidenceRefs?: string[];
  systemConclusionRequired?: boolean;
  confidence: "high" | "medium" | "low";
  nextAction: string;
  methodology: string;
};
```

### `RiskAssessment`

```ts
type RiskAssessment = {
  fundId: string;
  riskLevel: "low" | "medium" | "high";
  vetoes: string[];
  warnings: string[];
  aiEvidenceRiskSignals?: string[];
  pauseConditions: string[];
  invalidationConditions: string[];
  dataQuality: "complete" | "partial" | "snapshot_only" | "stale";
  nextReviewDate?: string;
};
```

### `ObservationPoolItem`

```ts
type ObservationPoolItem = {
  itemId: string;
  fundId: string;
  fundCode?: string;
  fundName: string;
  status: "watching" | "scoring" | "buy_plan_draft" | "paused" | "removed";
  entryReason: string;
  currentFundScore?: FundScore;
  currentRiskAssessment?: RiskAssessment;
  currentBuyPlan?: BuyPlan;
  systemConclusion?: SystemStrategyConclusion;
  nextReviewDate?: string;
};
```

### `BuyPlan`

```ts
type BuyPlan = {
  planId: string;
  fundId: string;
  fundCode?: string;
  fundName: string;
  createdAt: string;
  status: "draft" | "active" | "paused" | "completed" | "cancelled";
  maxPlannedExposurePercent: number;
  batchCount: number;
  batches: Array<{
    batchIndex: number;
    trigger: string;
    plannedExposurePercent: number;
    status: "pending" | "ready_for_system_plan" | "done" | "skipped";
  }>;
  pauseConditions: string[];
  invalidationConditions: string[];
  reviewDate?: string;
  systemConclusionId?: string;
  notes?: string;
};
```

### `PostBuyReview`

```ts
type PostBuyReview = {
  reviewId: string;
  fundId: string;
  fundCode?: string;
  fundName: string;
  buyPlanId?: string;
  reviewDate: string;
  originalThesis: string;
  actualOutcome: string;
  riskEvents: string[];
  decision: "continue_observe" | "pause_buying" | "remove_from_pool" | "revise_plan";
  notes?: string;
};
```

### `IndustryLongTermEvent`

```ts
type IndustryLongTermEvent = {
  eventId: string;
  industryId: string;
  industryName: string;
  eventDate: string;
  publishedAt: string;
  sourceType: "authorized_api" | "manual_import" | "internal_tag" | "mock";
  sourceName: string;
  sourceUrl?: string;
  title: string;
  summary: string;
  category:
    | "ai_demand"
    | "supply_chain"
    | "capex_cycle"
    | "overseas_demand"
    | "valuation_overheat"
    | "policy"
    | "earnings"
    | "short_term_noise"
    | "other";
  longTermImpact: "long_term_support" | "risk_or_invalidation" | "short_term_noise" | "mixed" | "insufficient_evidence";
  confidence: "low" | "medium" | "high";
  freshness: "fresh" | "watch" | "stale";
  thesisEffect: string;
  riskNote: string;
  invalidationSignal?: string;
  aiEvidenceId?: string;
};
```

### `IndustryEventImpactSummary`

```ts
type IndustryEventImpactSummary = {
  industryId: string;
  asOfDate: string;
  supportCount: number;
  riskCount: number;
  shortTermNoiseCount: number;
  confidence: "low" | "medium" | "high";
  impactDirection: "long_term_support" | "risk_or_invalidation" | "short_term_noise" | "mixed" | "insufficient_evidence";
  supportingEvidence: string[];
  weakeningEvidence: string[];
  invalidationConditions: string[];
  riskControlHint: string;
  methodology: string;
};
```

事件数据流：

1. 授权 API、手动导入、内部标签或 Mock 进入事件原始层。
2. 标准化为 `IndustryLongTermEvent`。
3. `lib/strategy/industry-events` 计算长期事件影响摘要。
4. 行业详情页展示事件影响，观察页展示关注项相关事件摘要。
5. 策略评分只能把事件作为行业 thesis 置信度和风险复盘输入，不直接输出买入指令。
6. AI 证据判读结果可增强事件摘要，但必须保留来源、置信度、不确定性和系统补证据标记。

## 5. 推荐接入顺序

1. 在 `types/` 增加 AI 证据、策略、风险、系统结论、持仓估值、观察池、买入计划、复盘类型。
2. 在 `mock/` 增加覆盖公告/新闻/报告判读、风险 veto、系统结论、持仓估值和各种推荐状态的样例。
3. 在 `lib/strategy` 或 adapter 层增加 AI 证据标准化 helper。
4. 在 `lib/risk` 增加风险评估纯函数，并接收 AI 证据风险信号。
5. 在 `lib/strategy` 增加推荐评分纯函数。
6. 将推荐分、AI 证据摘要和风险状态接入我的观察或我的持仓模块。
7. 将系统策略结论面板接入“可进入分批买入计划草稿”前置状态。
8. 将持仓当前估值和预估收益接入我的持仓列表。
9. 将买入计划草稿接入持仓决策辅助模块。
10. 增加买入后复盘记录展示。
11. 增加 CPO 光通信行业和长期事件影响分析。

每一步都必须小步提交，不允许一次性重构现有页面。

## 6. 边界规则

- 不新增页面，除非后续单独确认。
- 不替换我的持仓和持仓决策辅助模块。
- 不把普通观察池直接改成买入清单。
- 不自动生成交易订单。
- 不接券商账户。
- 不输出“必买”“满仓”“稳赚”“无风险”。
- 所有买入计划只能是系统结论生成的草稿和用户手动记录位，不能自动执行。
- AI 大模型不直接生成最终买入决定。
- AI 证据必须可追溯来源、发布时间、模型/提示词版本、置信度和不确定性。
- AI 判读失败、低置信度或高影响负面信号必须进入系统补证据或风险阻断路径。
- 持仓估值刷新只覆盖我的持仓基金，目标约 1 分钟一次，不扩展为全市场实时行情。
- 当前估值和预估收益必须带时间戳和状态，缺失时不得显示为 0。
- 行业事件不作为短线交易信号。
- 默认不做非授权网页抓取；真实资讯第一版只允许授权 API、手动导入或内部维护标签。

## 7. 验证要求

文档任务：

- 确认只修改目标文档。
- 确认 UTF-8 无 BOM。

业务代码任务：

- 运行 `npm.cmd run typecheck`。
- 运行 `npm.cmd run build`。
- 验证已有首页、行业、基金、对比、观察、持仓链路未被破坏。
- 检查策略和风险文案不越界。
