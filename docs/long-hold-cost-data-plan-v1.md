# 长期持有成本数据方案 V1

## 1. 文档定位

- 文档名称：长期持有成本数据方案 V1
- 适用对象：产品经理、后端架构师、数据工程师、后端开发工程师、测试工程师
- 关联文档：
  - `E:\game\docs\agents\financial-product-manager-agent.md`
  - `E:\game\docs\agents\backend-solution-architect-agent.md`
  - `E:\game\docs\data-architecture-v1.md`
  - `E:\game\docs\database-schema-v1.md`
  - `E:\game\docs\prd-v1-industry-fund-opportunity.md`

本文档用于在现有后端基础上，补齐“长期持有成本”这一核心产品能力的数据方案。它不是另起一套系统，而是在当前已存在的基金主数据、基金日度指标、基金对比快照、盘后任务与 PostgreSQL 表结构之上，新增费用规则、赎回费阶梯与持有成本快照能力。

## 2. 背景与目标

当前系统已经具备以下基础：

- `fund_master` 已承载基金主数据与基础费率字段。
- `fund_daily_metrics` 已承载收益、回撤、波动、规模等日度指标。
- `fund_compare_daily` 已承载基金对比页核心快照。
- 后端已具备盘后批处理、AKShare 主数据抓取、日度快照生成与 FastAPI 输出能力。

但从零售选基视角看，当前仍缺一个关键能力：用户无法结构化比较“不同基金在不同持有期限下的真实成本差异”。这会直接影响产品从“看行业、看热度”走向“真正能辅助长期持有筛选”。

本方案的目标是：

1. 在现有表结构与任务链路上新增长期持有成本所需的数据域。
2. 支持按 `7/30/90/180/365/730` 天输出基金成本比较结果。
3. 明确区分“原始费用规则”“结构化规则”“计算结果快照”三层。
4. 为基金发现页、基金对比页、后续长期持有筛选能力提供统一数据来源。
5. 保持盘后批处理与 T+1 发布模式，不引入实时交易系统复杂度。

## 3. 业务边界

### 3.1 本阶段要支持的能力

- 记录基金申购费、管理费、托管费、销售服务费等基础费率。
- 记录赎回费阶梯规则，包括不同持有天数阈值对应的赎回费率。
- 支持根据统一口径计算长期持有成本快照。
- 为对比页提供不同持有期限下的成本比较结果。
- 为发现页预留“长期持有成本筛选”所需字段。
- 为产品解释位输出口径说明和风险提示字段。

### 3.2 本阶段明确不做的能力

- 不做真实账户级持仓成本计算。
- 不做个税、分红再投资、佣金等复杂个人交易口径。
- 不做实时盘中成本刷新。
- 不做自动买卖建议或收益承诺式结论。
- 不做所有基金公告规则的全文解析引擎。

## 4. 与当前系统的衔接原则

### 4.1 不推翻现有主数据结构

`fund_master` 中已有 `fee_rate` 字段，当前可以继续保留，作为通用展示或兜底字段。但后续不再把它视为完整成本模型，只把它作为：

- 简化展示字段
- 历史兼容字段
- 当结构化费用规则尚未补齐时的兜底参考

### 4.2 新能力以扩展表方式接入

长期持有成本相关能力通过新增表和新增快照字段接入，避免大幅修改已有 API 和任务链路。现有对比任务与 API 可以先保持可用，再逐步升级为消费新快照。

### 4.3 继续沿用盘后批处理

费用规则不需要盘中频繁变化，因此：

- 原始费用规则以低频更新为主
- 成本快照按日度或规则变更后重算
- 发布口径继续沿用“最近一次有效更新”

## 5. 数据域设计

本次新增三类核心数据域：

### 5.1 费用规则主数据域

用于存储基金的基础费用规则和来源信息，回答“这只基金有哪些静态费率字段”。

建议新增表：

- `fund_fee_rule`

### 5.2 赎回费阶梯规则域

用于存储持有多少天对应多少赎回费的结构化规则，回答“持有多久免手续费，或在不同区间费率如何变化”。

建议新增表：

- `fund_redemption_fee_ladder`

### 5.3 持有成本快照域

用于存储按标准持有期限计算的成本结果，回答“如果用户持有 7 天、30 天、90 天、180 天、365 天、730 天，成本差异分别是多少”。

建议新增表：

- `fund_holding_cost_snapshot`

## 6. 核心表设计建议

### 6.1 `fund_fee_rule`

用途：

- 存放基金费用规则的结构化主记录
- 支撑基金发现页、基金对比页的长期持有成本能力

建议字段：

- `id`
- `fund_id`
- `trade_date`
- `subscription_fee_rate`
- `purchase_fee_rate`
- `management_fee_rate`
- `custodian_fee_rate`
- `sales_service_fee_rate`
- `fee_rule_text`
- `source_name`
- `source_batch_id`
- `data_version`
- `quality_status`
- `created_at`
- `updated_at`

说明：

- `subscription_fee_rate` 与 `purchase_fee_rate` 可根据实际数据源保留其一或并存。
- `fee_rule_text` 用于保留原始说明文本，方便审计与人工复核。
- `quality_status` 用于标记 `complete`、`partial`、`missing` 等状态。

### 6.2 `fund_redemption_fee_ladder`

用途：

- 结构化记录赎回费阶梯规则
- 支撑免赎回费判断和不同持有期成本计算

建议字段：

- `id`
- `fund_id`
- `trade_date`
- `min_holding_days`
- `max_holding_days`
- `redemption_fee_rate`
- `rule_text`
- `is_free_threshold`
- `priority_rank`
- `source_name`
- `source_batch_id`
- `data_version`
- `quality_status`
- `created_at`
- `updated_at`

说明：

- `min_holding_days`、`max_holding_days` 表示规则区间。
- `is_free_threshold=true` 用于显式标记某条规则是否表示已进入免赎回费区间。
- `priority_rank` 用于解决部分来源中规则顺序不稳定的问题。

### 6.3 `fund_holding_cost_snapshot`

用途：

- 预计算不同持有期下的总成本结果
- 作为基金对比页和后续发现页筛选的直接消费结果

建议字段：

- `id`
- `trade_date`
- `fund_id`
- `holding_days`
- `subscription_cost_rate`
- `redemption_cost_rate`
- `management_cost_rate`
- `custodian_cost_rate`
- `sales_service_cost_rate`
- `total_cost_rate`
- `is_redemption_fee_free`
- `matched_redemption_rule_json`
- `calculation_methodology_json`
- `source_batch_id`
- `data_version`
- `created_at`
- `updated_at`

说明：

- `holding_days` 只需先覆盖标准场景：`7/30/90/180/365/730`
- `matched_redemption_rule_json` 用于记录命中的赎回费规则，便于解释。
- `calculation_methodology_json` 用于记录计算口径版本、年化折算逻辑和兜底规则。

## 7. 计算口径建议

### 7.1 标准持有期

统一使用以下持有期场景：

- 7 天
- 30 天
- 90 天
- 180 天
- 365 天
- 730 天

### 7.2 成本计算拆分

建议把总成本拆成五段，避免黑盒：

- 申购成本
- 赎回成本
- 管理费成本
- 托管费成本
- 销售服务费成本

统一输出：

- `total_cost_rate = subscription_cost_rate + redemption_cost_rate + management_cost_rate + custodian_cost_rate + sales_service_cost_rate`

### 7.3 年化费用折算口径

对管理费、托管费、销售服务费，V1 建议按简单线性口径折算：

- `annual_rate * holding_days / 365`

说明位必须明确写出：

- 本结果用于基金之间的相对比较
- 未纳入个人实际成交折扣、渠道费率优惠与税务差异
- 不等同于用户真实到账成本

### 7.4 赎回费匹配逻辑

赎回费率按照 `holding_days` 与阶梯规则匹配：

- 找到满足 `min_holding_days <= holding_days <= max_holding_days` 的规则
- 若无 `max_holding_days`，可视为开放上限
- 若命中免赎回费区间，则 `redemption_cost_rate = 0`
- 若规则缺失，则标记质量状态，不静默返回 0

## 8. 数据来源建议

### 8.1 本阶段优先方案

考虑当前系统已基于 AKShare 与手工模板运行，长期持有成本相关数据建议分两步推进：

1. 第一阶段：
   - 基金主数据与日度表现继续走 AKShare
   - 费用规则先通过手工模板或半手工整理导入
2. 第二阶段：
   - 在稳定来源确认后，再逐步接入自动抓取或公告解析

### 8.2 为什么先不强推全自动

费用与赎回规则往往存在以下特点：

- 数据口径分散
- 文本表述不统一
- 渠道折扣规则复杂
- 单次抓取稳定性不一定高

因此在当前阶段，先把结构定义和快照逻辑做对，比立即追求全量自动化更重要。

## 9. 任务编排建议

本能力可接入现有盘后任务链路，建议新增如下任务：

### 9.1 `fund_fee_rule_ingestion`

用途：

- 导入或抓取基金费用规则主数据
- 写入 `fund_fee_rule`

### 9.2 `fund_redemption_rule_ingestion`

用途：

- 导入或抓取赎回费阶梯规则
- 写入 `fund_redemption_fee_ladder`

### 9.3 `fund_holding_cost_snapshot_daily`

用途：

- 根据费用规则与标准持有期计算成本快照
- 写入 `fund_holding_cost_snapshot`

### 9.4 `fund_compare_snapshot_daily` 升级

现有任务已生成 `fund_compare_daily`。下一步建议升级为：

- 在原有收益与风险指标基础上，追加长期持有成本摘要
- 为基金对比页提供 `7/30/90/180/365/730` 天成本摘要
- 输出免赎回费门槛说明

## 10. API 与页面消费建议

### 10.1 基金对比页

建议新增输出能力：

- 各基金在标准持有期下的总成本率
- 是否已满足免赎回费门槛
- 赎回费规则摘要
- 费用规则完整度状态

### 10.2 基金发现页

本阶段先预留筛选字段，后续可演进出：

- 30 天持有总成本上限筛选
- 365 天持有总成本排序
- 是否存在明确免赎回费规则筛选

### 10.3 说明位

所有与成本相关的页面输出，都应附带：

- 计算口径说明
- 数据日期
- 数据来源说明
- 非投资建议提示

## 11. 数据质量要求

长期持有成本属于高敏感度业务字段，必须有质量标记。最低要求如下：

### 11.1 规则完整性检查

- 每只已纳入对比范围的基金，至少应有一条费用规则主记录
- 每只已纳入长期持有成本比较的基金，至少应能匹配一组赎回规则或被明确标记缺失

### 11.2 数值合理性检查

- 所有费率字段不得为负数
- 总成本率不得小于任一组成项
- 免赎回费区间不应出现正赎回费率

### 11.3 时效性检查

- 费用规则更新时间超过阈值时，应输出“可能过期”标记
- 快照任务若未成功运行，不应覆盖上一批已发布结果

## 12. 演进建议

### 12.1 V1

- 先补齐表结构
- 先支持标准持有期成本快照
- 先服务基金对比页

### 12.2 V1.1

- 将长期持有成本接入基金发现页排序与筛选
- 增加基金费用规则质量看板

### 12.3 V2

- 引入更自动化的费用规则抓取
- 引入更多渠道费率或场内场外差异规则
- 支持更丰富的成本解释模型

## 13. 架构结论

在现有基础上推进长期持有成本能力，最稳妥的路径不是推翻现有后端，而是：

1. 保留当前基金主数据、日度指标、盘后任务和对比快照体系。
2. 新增费用规则、赎回阶梯和持有成本快照三张核心表。
3. 以手工模板或半自动方式先完成规则入库。
4. 通过新的日度快照任务，把成本比较结果接入对比页和后续发现页。

这样做可以确保我们继续沿着当前的 Windows + PostgreSQL + FastAPI + 盘后任务架构前进，同时让产品真正具备“比较哪些基金更适合长期持有”的核心能力。
