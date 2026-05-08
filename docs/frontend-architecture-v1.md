# 行业基金机会捕捉平台前端架构方案 V1

## 1. 文档信息

- 文档名称：行业基金机会捕捉平台前端架构方案 V1
- 文档版本：V1.0
- 适用对象：前端架构师、前端工程师、产品经理、设计师、测试工程师
- 关联文档：
  - `E:\game\docs\prd-v1-industry-fund-opportunity.md`
  - `E:\game\docs\agents\solution-architect-agent.md`
- 技术基线：Next.js + Tailwind CSS + TypeScript + Mock API
- 文档目标：将既有 PRD 转换为足够支持前端工程直接开工的实施方案，明确工程目录、数据模型、页面路由、组件边界、状态管理、图表封装、测试和部署方向

## 2. 架构目标与约束

### 2.1 架构目标

1. 支撑行业机会发现、行业验证、基金筛选、基金对比、加入观察五段式用户链路。
2. 以网页前端演示版为目标，优先保证信息表达专业性、交互完整性和演示稳定性。
3. 使用 Mock 数据构建真实感较强的产品演示体验，同时保留未来接入真实数据源的清晰演进路径。
4. 通过类型系统、组件分层和功能域拆分，降低页面耦合度，便于多名工程师并行协作。
5. 将“可解释性”和“风险边界”作为前端信息架构的一部分，而不是页面后补说明。

### 2.2 架构约束

1. 首版不接入真实基金行情、账户体系、交易能力、推荐引擎与复杂后端服务。
2. 首版以桌面端优先，同时保证移动端响应式浏览和基础交互可用。
3. 路由按照页面能力拆分，不按组件或技术类别拆分。
4. 指标展示必须带有口径说明位和风险提示位，禁止出现收益承诺型表达。
5. 状态管理优先采用轻量方案，避免在 V1 引入非必要的全局复杂状态库。

## 3. 系统架构总览

### 3.1 总体分层

前端工程采用“页面层 - 功能域层 - 通用组件层 - 数据适配层 - 类型层”的分层结构。

1. 页面层  
   承载路由、页面级布局、SEO 元信息、页面级数据装配和状态组织。

2. 功能域层  
   按业务域封装行业、基金、对比、观察列表等功能模块，包含模块组件、模块 hooks、模块数据适配器。

3. 通用组件层  
   提供页面间共享的 UI 组件，包括卡片、表格、标签、图表容器、空状态、风险提示和布局容器。

4. 数据适配层  
   负责从 Mock API 或静态数据中获取数据，并转换为页面模型或组件输入模型，隔离未来真实接口变更。

5. 类型层  
   统一维护 PRD 对应的业务实体、页面视图模型、筛选条件模型和组件输入类型。

### 3.2 运行方式

1. 使用 Next.js App Router 组织页面与布局。
2. 默认采用服务端路由加载静态 Mock 数据，再将可交互部分下沉到客户端组件。
3. 页面演示数据来自本地静态 JSON 或本地 API Route，两者通过统一数据访问函数暴露。
4. 观察列表和基金对比池采用浏览器本地持久化，支持无登录状态下的演示闭环。

### 3.3 数据流原则

1. 页面入口只依赖功能域暴露的查询函数或页面组装函数，不直接拼接底层数据。
2. Mock 原始数据与页面展示模型分离，避免后续真实数据接入时大面积修改页面。
3. 筛选条件、排序条件、对比池、观察列表分别作为独立状态单元管理。
4. 所有与“结论、评分、标签、提示”相关的展示必须同时携带口径说明或说明位字段。

## 4. 推荐目录结构

以下为推荐的首版目录结构：

```text
E:\game
├─ app
│  ├─ layout.tsx
│  ├─ page.tsx
│  ├─ discover
│  │  └─ page.tsx
│  ├─ industries
│  │  └─ [industryId]
│  │     └─ page.tsx
│  ├─ funds
│  │  └─ page.tsx
│  ├─ compare
│  │  └─ page.tsx
│  ├─ watchlist
│  │  └─ page.tsx
│  └─ api
│     ├─ industries
│     │  ├─ route.ts
│     │  └─ [industryId]
│     │     └─ route.ts
│     ├─ funds
│     │  └─ route.ts
│     ├─ compare
│     │  └─ route.ts
│     └─ watchlist
│        └─ route.ts
├─ components
│  ├─ layout
│  ├─ ui
│  ├─ charts
│  └─ feedback
├─ features
│  ├─ market-overview
│  ├─ industries
│  ├─ funds
│  ├─ compare
│  └─ watchlist
├─ lib
│  ├─ api
│  ├─ adapters
│  ├─ constants
│  ├─ formatters
│  ├─ storage
│  └─ utils
├─ mock
│  ├─ industries
│  ├─ funds
│  ├─ compare
│  ├─ watchlist
│  └─ shared
├─ types
│  ├─ domain
│  ├─ view-models
│  ├─ filters
│  └─ components
├─ styles
│  ├─ globals.css
│  └─ tokens.css
├─ tests
│  ├─ unit
│  ├─ integration
│  └─ e2e
└─ docs
```

### 4.1 目录职责说明

- `app/`：路由入口、页面布局、路由级数据获取和 API Route。
- `components/layout/`：顶栏、侧边导航、页面框架、分区容器。
- `components/ui/`：按钮、标签、卡片、表格、筛选器、空状态、提示条等基础 UI。
- `components/charts/`：趋势图、柱状图、热力图等图表容器与统一样式封装。
- `components/feedback/`：加载骨架、错误态、风险提示、口径说明、无数据提示。
- `features/`：按业务域封装页面模块和交互逻辑，是多人协作的主要边界。
- `lib/api/`：面向页面和功能域的数据访问函数。
- `lib/adapters/`：原始 Mock 数据到页面模型的转换器。
- `lib/storage/`：对比池、观察列表的本地持久化封装。
- `mock/`：静态 Mock 数据源和说明位配置。
- `types/`：统一业务类型、页面模型和组件类型。
- `tests/`：单元、集成和端到端测试用例。

## 5. 路由设计

### 5.1 路由清单

| 页面 | 路由 | 作用 |
| --- | --- | --- |
| 首页 | `/` | 行业机会发现入口，展示榜单、热力图、重点行业、热门基金映射 |
| 发现页 | `/discover` | 作为首页的延展页，承接更多行业机会列表、排序、过滤与专题浏览 |
| 行业详情页 | `/industries/[industryId]` | 展示单行业的结论、指标、图表、事件和相关基金 |
| 基金发现页 | `/funds` | 展示基金筛选、排序、卡片与表格结果 |
| 基金对比页 | `/compare` | 展示 2 至 4 只基金的横向对比 |
| 我的观察页 | `/watchlist` | 展示本地收藏的行业与基金，以及最近变化摘要 |

### 5.2 查询参数设计

基金发现页和发现页优先通过查询参数承载筛选条件，便于分享和状态恢复。

#### `/discover`

- `sort`：行业排序字段，例如 `opportunityScore`、`performance20d`
- `tag`：机会标签，例如 `trend-confirmed`
- `risk`：风险等级筛选

#### `/funds`

- `industry`：行业标识
- `fundType`：基金类型
- `sort`：排序字段
- `order`：升序或降序
- `exchange`：是否场内交易
- `feeBand`：费率区间

#### `/compare`

- `ids`：基金标识数组，逗号拼接，例如 `F001,F008,F015`

### 5.3 路由实现原则

1. 页面级路由只关心当前页面所需的数据装配，不直接承载复杂业务逻辑。
2. 路由参数解析后转换为显式筛选模型，再传入功能域模块。
3. 行业详情页的 `industryId` 为主键型路由参数，若不存在对应数据则进入标准化 404 或空态页。
4. 对比页若参数不足 2 个基金标识，进入“引导补充选择”的空态页，而不是直接报错。

## 6. 核心类型设计

### 6.1 领域类型

以下类型为前端工程中的正式 TypeScript 类型基线，应与 PRD 语义保持一致。

```ts
export type RiskLevel = "low" | "medium" | "high";
export type OpportunityLabel =
  | "opportunity-enhancing"
  | "trend-confirmed"
  | "low-position-watch"
  | "hot-watch"
  | "risk-elevated";

export interface IndustryOpportunityCard {
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
  rationaleNote: string;
  updatedAt: string;
}

export interface IndustryMetricGroup {
  score: number;
  label: string;
  note: string;
}

export interface IndustryTimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  sourceType: "policy" | "earnings" | "market" | "theme";
}

export interface IndustryDetailSnapshot {
  industryId: string;
  industryName: string;
  headline: string;
  opportunityLabel: OpportunityLabel;
  thesisSummary: string;
  trendMetrics: IndustryMetricGroup;
  capitalMetrics: IndustryMetricGroup;
  valuationMetrics: IndustryMetricGroup;
  riskMetrics: IndustryMetricGroup;
  timelineEvents: IndustryTimelineEvent[];
  relatedFunds: FundListItem[];
  disclaimer: string;
  chartSeries: {
    trend: Array<{ date: string; value: number }>;
    capitalFlow: Array<{ date: string; value: number }>;
  };
}

export interface FundListItem {
  fundId: string;
  fundName: string;
  fundCode: string;
  fundType: "etf" | "linked" | "active";
  theme: string;
  trackingTarget: string;
  return1m: number;
  return3m: number;
  return6m: number;
  maxDrawdown: number;
  volatility: number;
  aum: number;
  feeRate: number;
  tradableOnExchange: boolean;
  tags: string[];
  rationaleNote: string;
}

export interface FundCompareItem {
  fundId: string;
  fundName: string;
  fundCode: string;
  returnMetrics: {
    return1m: number;
    return3m: number;
    return6m: number;
  };
  riskMetrics: {
    maxDrawdown: number;
    volatility: number;
    riskLevel: RiskLevel;
  };
  feeRate: number;
  aum: number;
  inceptionDate: string;
  topHoldings: string[];
  concentration: number;
  trackingDeviationNote: string;
}

export interface WatchlistItem {
  itemId: string;
  itemType: "industry" | "fund";
  displayName: string;
  statusLabel: string;
  latestChange: string;
  updatedAt: string;
  entryLink: string;
}
```

### 6.2 页面模型与组件输入模型拆分

为降低组件复杂度，建议将领域实体与页面模型分离。

1. 领域实体  
   对应 `IndustryOpportunityCard`、`IndustryDetailSnapshot`、`FundListItem`、`FundCompareItem`、`WatchlistItem`，用于数据传输与统一业务定义。

2. 页面模型  
   例如 `HomePageViewModel`、`IndustryDetailPageViewModel`、`FundsPageViewModel`。  
   由适配器从领域实体组装而来，包含页面区块顺序、标题文案、说明信息和图表配置。

3. 组件输入模型  
   例如 `MetricCardProps`、`HeatmapPoint`、`FundTableRow`、`RiskNoticeProps`。  
   面向具体组件，字段更小、更稳定，避免组件直接绑定完整业务对象。

### 6.3 筛选和交互类型

建议补充以下类型：

```ts
export interface FundFilterState {
  industry?: string;
  fundType?: "etf" | "linked" | "active";
  exchange?: boolean;
  feeBand?: "low" | "medium" | "high";
  sort?: "return3m" | "return6m" | "aum" | "feeRate" | "volatility";
  order?: "asc" | "desc";
}

export interface IndustryDiscoverFilterState {
  tag?: string;
  risk?: RiskLevel;
  sort?: "opportunityScore" | "performance20d" | "trendScore";
}

export interface CompareStoreState {
  fundIds: string[];
}

export interface WatchlistStoreState {
  items: WatchlistItem[];
}
```

## 7. Mock 数据组织方案

### 7.1 基本原则

1. Mock 数据必须同时满足“可演示”和“可替换”。
2. 原始数据存放于 `mock/`，页面不直接读取 JSON 文件。
3. 所有页面通过 `lib/api/` 提供的数据访问函数获取数据。
4. Mock 数据保留更新时间、口径说明和风险说明字段，以保证演示版本具备金融产品可信感。

### 7.2 数据文件拆分建议

```text
mock
├─ industries
│  ├─ industry-opportunities.json
│  ├─ industry-heatmap.json
│  └─ industry-details.json
├─ funds
│  ├─ fund-list.json
│  ├─ fund-compare.json
│  └─ fund-filters.json
├─ watchlist
│  └─ watchlist-sample.json
└─ shared
   ├─ market-summary.json
   ├─ disclaimers.json
   └─ metadata.json
```

### 7.3 静态 JSON 与 Mock API 的职责划分

1. 静态 JSON  
   用于保存稳定样例数据，例如行业榜单、基金列表、风险文案、事件时间线。

2. Mock API Route  
   用于模拟真实前后端交互方式，支持筛选、排序、分页和按标识查询。

### 7.4 Mock API 设计建议

| 路径 | 作用 |
| --- | --- |
| `/api/industries` | 获取行业榜单、热力图、重点行业数据 |
| `/api/industries/[industryId]` | 获取单行业详情 |
| `/api/funds` | 根据筛选条件返回基金列表 |
| `/api/compare` | 根据基金标识返回对比数据 |
| `/api/watchlist` | 返回默认观察列表示例数据 |

### 7.5 数据适配模式

建议采用“源数据 -> 领域模型 -> 页面模型”的适配链路：

1. `mock/*.json` 提供原始演示数据。
2. `lib/api/*` 提供查询函数，负责读取和筛选原始数据。
3. `lib/adapters/*` 负责将数据转换为页面和组件可消费的数据结构。
4. 页面仅依赖适配后的结果，不直接了解底层文件结构。

## 8. 状态管理方案

### 8.1 状态分层原则

1. 可由 URL 表达的状态，优先放在查询参数中。
2. 仅页面内部短生命周期状态，使用 React 本地状态。
3. 跨页面但无需后端同步的状态，使用轻量客户端 store 加本地持久化。
4. 服务端静态数据优先在页面层获取，避免无必要的客户端二次请求。

### 8.2 具体策略

#### 页面本地状态

- 列表视图切换
- 展开与收起
- Tab 切换
- 排序下拉面板显示状态

实现建议：React `useState` 或 `useReducer`

#### URL 状态

- 基金筛选条件
- 行业发现页排序与标签筛选
- 对比页基金标识集合

实现建议：Next.js `searchParams`

#### 跨页面持久状态

- 基金对比池
- 观察列表

实现建议：使用 Zustand 或自定义轻量 store，并通过 `localStorage` 持久化  
默认推荐：Zustand，原因是体积轻、心智负担低、适合 V1 演示应用。

### 8.3 状态模块建议

```text
features
├─ compare
│  ├─ store.ts
│  └─ hooks.ts
└─ watchlist
   ├─ store.ts
   └─ hooks.ts
```

### 8.4 持久化边界

1. 只持久化业务最小必要数据，例如基金 ID、观察项 ID 和基础标签。
2. 页面展示细节仍从 Mock 数据重新装配，避免本地存储冗余快照。
3. 本地存储结构要有版本号，便于未来升级迁移。

## 9. 组件分层与协作边界

### 9.1 分层原则

组件拆分遵循“稳定框架下沉，业务语义上提”的原则。

1. 布局组件  
   用于页面结构和公共导航，不承载业务判断。

2. 通用展示组件  
   提供卡片、表格、标签、按钮、空状态、说明条等基础能力。

3. 图表容器组件  
   统一封装图表库、图例、颜色规范、无数据占位与加载占位。

4. 业务模块组件  
   对应行业榜单、基金筛选器、基金对比表、观察列表等具体产品模块。

5. 页面容器组件  
   负责将多个业务模块按页面顺序组装。

### 9.2 组件分类建议

#### 布局组件

- `AppShell`
- `TopNavigation`
- `PageSection`
- `PageHeader`
- `ContentGrid`

#### 通用 UI 组件

- `MetricCard`
- `TagBadge`
- `ScoreBadge`
- `SectionTitle`
- `FilterChip`
- `EmptyState`
- `ErrorState`
- `DisclosureNote`
- `RiskNotice`

#### 图表组件

- `TrendLineChart`
- `CapitalBarChart`
- `OpportunityHeatmap`
- `CompareRadarPlaceholder`
- `ChartCard`

#### 行业模块组件

- `IndustryOpportunityTable`
- `IndustryOpportunityCardGrid`
- `IndustryHeatmapPanel`
- `IndustryHighlightPanel`
- `IndustryMetricSummary`
- `IndustryEventTimeline`

#### 基金模块组件

- `FundFilterPanel`
- `FundResultSummary`
- `FundTable`
- `FundCardGrid`
- `FundCompareSummary`
- `FundHoldingsPanel`

#### 观察模块组件

- `WatchlistPanel`
- `WatchlistRecentChanges`
- `QuickActionBar`

### 9.3 协作分工建议

多人协作时建议按功能域拆分任务：

1. 工程骨架与布局层
2. 首页与行业域模块
3. 基金发现与基金对比模块
4. 观察列表状态与持久化模块
5. Mock API 与数据适配层

## 10. 图表方案

### 10.1 图表库选择原则

首版建议使用一套轻量、React 友好、易于统一样式的图表库。默认推荐 `Recharts`，原因如下：

1. 上手成本低，适合演示版快速落地。
2. 折线图、柱状图等常见金融信息图支持较好。
3. 可通过自定义容器和配色统一页面风格。
4. 后续若需升级为更强能力图表，可通过容器组件替换内部实现。

### 10.2 图表实现边界

1. 首版重点支持折线图、柱状图和热力图占位。
2. 热力图可先采用自绘网格或 CSS 驱动方案，不必在 V1 引入复杂图形计算库。
3. 对比页若雷达图信息表达不足，可优先使用结构化指标对比表，不强行引入复杂视觉。
4. 每个图表组件必须支持以下状态：
   - 正常数据态
   - 无数据态
   - 加载骨架态
   - 口径说明位

### 10.3 图表组件封装要求

1. 图表组件只接收序列数据和显示配置，不直接读取业务对象。
2. 图表标题、注释、更新时间、说明文案由 `ChartCard` 容器统一管理。
3. 配色遵循统一设计 token，禁止页面内各自定义色。
4. 所有图表需预留响应式缩放能力。

## 11. 页面实施说明

### 11.1 首页

#### 数据输入

- 市场概览
- 行业机会榜单
- 热力图数据
- 今日重点行业
- 热门基金映射
- 风险提示

#### 页面结构建议

1. 顶部导航与产品定位横幅
2. 市场概览条
3. 行业机会榜单与热力图区双栏布局
4. 今日重点行业卡片区
5. 热门基金映射区
6. 风险与口径说明区

### 11.2 行业详情页

#### 数据输入

- `IndustryDetailSnapshot`
- 关联基金列表

#### 页面结构建议

1. 标题区与一句话结论
2. 机会结论卡
3. 四维指标卡组
4. 趋势与资金双图区域
5. 催化事件时间线
6. 相关基金表格
7. 风险提示

### 11.3 基金发现页

#### 数据输入

- 基金筛选配置
- 基金结果列表

#### 页面结构建议

1. 条件筛选面板
2. 结果摘要与排序条
3. 表格视图与卡片视图切换
4. 批量加入对比或观察操作

### 11.4 基金对比页

#### 数据输入

- `FundCompareItem[]`

#### 页面结构建议

1. 对比池概览
2. 核心收益风险摘要卡
3. 指标对比表
4. 持仓与风格对比
5. 风险提示与说明

### 11.5 我的观察页

#### 数据输入

- 观察列表状态
- 最近变化摘要

#### 页面结构建议

1. 自选行业列表
2. 自选基金列表
3. 最近变化概览
4. 空状态引导

## 12. 测试策略

### 12.1 测试目标

1. 验证核心类型与数据适配是否稳定。
2. 验证页面渲染与关键交互链路是否可用。
3. 验证对比池与观察列表的持久化行为是否正确。

### 12.2 测试分层

#### 单元测试

覆盖对象：

- `lib/adapters/*`
- `lib/formatters/*`
- `lib/storage/*`
- `features/*/store.ts`

重点场景：

1. 原始数据到页面模型的转换正确。
2. 风险等级、机会标签、收益率格式化等工具函数输出一致。
3. 本地存储读写和版本迁移逻辑正确。

#### 组件与集成测试

覆盖对象：

- 筛选面板
- 基金表格
- 对比页关键模块
- 观察列表模块

重点场景：

1. 调整筛选条件后结果列表刷新。
2. 选择基金加入对比池后对比页可见。
3. 行业或基金加入观察后刷新页面仍存在。
4. 无数据、错误态和空态按预期显示。

#### 端到端测试

建议使用 Playwright，覆盖核心用户链路：

1. 从首页进入行业详情页。
2. 从行业详情页跳转基金发现页并带入行业筛选。
3. 从基金发现页加入 2 至 4 只基金进入对比页。
4. 将行业和基金加入观察列表并在观察页查看。

### 12.3 验收用例建议

1. 首页行业榜单、热力图、重点行业和风险提示均可渲染。
2. 不存在的 `industryId` 进入标准空态或 404 页面。
3. 基金筛选参数变更会同步到 URL。
4. 对比页少于 2 只基金时显示引导态。
5. 清空本地存储后观察页回到空状态。

## 13. 部署建议

### 13.1 本地开发

1. 使用 Node.js LTS 版本。
2. 使用 `pnpm` 作为默认包管理器。
3. 环境变量只保留最小集合，例如应用标题、演示版本号、未来 API 基地址占位。

### 13.2 演示环境部署

首版建议部署到支持 Next.js 的前端托管平台，默认推荐 Vercel。原因如下：

1. 与 Next.js 集成成本低。
2. 适合静态页面与轻量 API Route 的混合部署。
3. 便于快速预览与演示迭代。

### 13.3 资源组织建议

1. Mock 数据随应用一同部署，不单独依赖外部服务。
2. 静态图标和品牌资源放入标准静态资源目录。
3. 若后续需要接入真实接口，优先通过环境变量切换数据提供方，而不是重写页面层。

## 14. 从演示版到真实数据版的演进路径

### 14.1 保持不变的部分

1. 路由结构
2. 核心领域类型语义
3. 组件层级与页面结构
4. 对比池与观察列表的本地交互模型

### 14.2 可替换的部分

1. `lib/api/` 中的数据来源
2. `mock/` 下的静态数据
3. `lib/adapters/` 中与后端字段映射相关的适配逻辑

### 14.3 演进步骤建议

1. 第一步：静态 JSON 驱动页面，完成完整演示体验。
2. 第二步：引入本地 API Route，模拟筛选、排序和按标识查询。
3. 第三步：将 API Route 内部数据源替换为真实服务调用。
4. 第四步：补充更新时间、接口异常处理、缓存和监控能力。

## 15. 首版关键结论

1. 首版工程技术栈明确为 Next.js + Tailwind CSS + TypeScript + Mock API。
2. 工程按页面能力和业务域组织，避免后续目录随组件堆叠失控。
3. 页面只消费适配后的页面模型，Mock 数据与页面实现解耦。
4. 观察列表和对比池使用轻量状态管理加本地持久化即可满足 V1 目标。
5. 图表以轻量封装优先，重点保证一致性、可解释性和可替换性。
6. 本方案已足够支撑前端工程初始化、页面开发、Mock 数据建模和联调演示。
