# 行业基金机会捕捉平台数据库表设计 V1

## 1. 文档信息

- 文档名称：行业基金机会捕捉平台数据库表设计 V1
- 文档版本：V1.0
- 适用对象：后端工程师、数据工程师、架构师、测试工程师
- 关联文档：
  - `E:\game\docs\data-architecture-v1.md`
  - `E:\game\docs\prd-v1-industry-fund-opportunity.md`
  - `E:\game\docs\frontend-architecture-v1.md`

## 2. 设计原则

1. 当前数据库设计只服务于已完成的前端 V1 页面，不额外扩张产品边界。
2. 所有面向前端的结果数据优先采用“按交易日快照”设计，而不是请求时动态计算。
3. 原始采集、标准化结果、页面聚合快照和治理日志分层存储。
4. 所有核心结果表必须包含 `trade_date`、`data_version`、`updated_at` 字段。
5. 若当日批次失败，不覆盖上一成功版本，因此发布状态需独立建模。

## 3. 命名与约定

### 3.1 命名规范

1. 主数据表使用 `*_master`
2. 日指标表使用 `*_daily_metrics`
3. 页面快照表使用 `*_snapshot_daily`
4. 治理与日志表使用 `job_*`、`data_quality_*`、`source_*`

### 3.2 公共字段建议

所有核心业务表建议包含以下公共字段：

- `id`：主键
- `created_at`：创建时间
- `updated_at`：更新时间

所有日级结果表建议额外包含：

- `trade_date`：交易日
- `data_version`：数据版本号
- `source_batch_id`：来源批次号

## 4. 主数据层

### 4.1 `fund_master`

用途：存储基金基础主数据，服务基金发现页、基金对比页和行业详情页基金映射。

建议字段：

- `id` bigint primary key
- `fund_id` varchar(64) unique not null
- `fund_code` varchar(32) unique not null
- `fund_name` varchar(255) not null
- `fund_type` varchar(32) not null
- `theme` varchar(128) not null
- `tracking_target` varchar(255) not null
- `fund_company` varchar(128)
- `tradable_on_exchange` boolean not null default false
- `fee_rate` numeric(8,4)
- `inception_date` date
- `status` varchar(32) default 'active'
- `created_at` timestamp not null
- `updated_at` timestamp not null

索引建议：

- `idx_fund_master_theme`
- `idx_fund_master_fund_type`
- `idx_fund_master_company`

### 4.2 `industry_master`

用途：存储行业主数据，服务首页榜单、行业详情页和行业映射。

建议字段：

- `id` bigint primary key
- `industry_id` varchar(64) unique not null
- `industry_name` varchar(128) unique not null
- `display_name` varchar(128)
- `sort_order` integer default 0
- `active_flag` boolean default true
- `risk_disclaimer_template` text
- `created_at` timestamp not null
- `updated_at` timestamp not null

### 4.3 `industry_fund_mapping`

用途：维护行业与基金的映射关系。

建议字段：

- `id` bigint primary key
- `industry_id` varchar(64) not null
- `fund_id` varchar(64) not null
- `mapping_type` varchar(32) default 'theme'
- `priority_rank` integer default 0
- `created_at` timestamp not null
- `updated_at` timestamp not null

唯一约束建议：

- `(industry_id, fund_id)`

## 5. 日级指标层

### 5.1 `fund_daily_metrics`

用途：存储基金盘后日级指标，供基金发现、基金对比和观察摘要使用。

建议字段：

- `id` bigint primary key
- `trade_date` date not null
- `fund_id` varchar(64) not null
- `return_1m` numeric(10,4)
- `return_3m` numeric(10,4)
- `return_6m` numeric(10,4)
- `max_drawdown` numeric(10,4)
- `volatility` numeric(10,4)
- `aum` numeric(18,4)
- `founded_years` integer
- `top_holdings_json` jsonb
- `concentration_label` varchar(32)
- `tracking_deviation_note` text
- `source_batch_id` varchar(64) not null
- `data_version` varchar(64) not null
- `created_at` timestamp not null
- `updated_at` timestamp not null

唯一约束建议：

- `(trade_date, fund_id, data_version)`

索引建议：

- `idx_fund_daily_trade_date`
- `idx_fund_daily_fund_id`

### 5.2 `industry_daily_metrics`

用途：存储行业盘后日级指标，供行业机会评分与行业详情展示使用。

建议字段：

- `id` bigint primary key
- `trade_date` date not null
- `industry_id` varchar(64) not null
- `performance_5d` numeric(10,4)
- `performance_20d` numeric(10,4)
- `performance_60d` numeric(10,4)
- `trend_score` numeric(10,2)
- `capital_score` numeric(10,2)
- `valuation_score` numeric(10,2)
- `risk_score` numeric(10,2)
- `risk_level` varchar(16)
- `fund_count` integer
- `source_batch_id` varchar(64) not null
- `data_version` varchar(64) not null
- `created_at` timestamp not null
- `updated_at` timestamp not null

唯一约束建议：

- `(trade_date, industry_id, data_version)`

### 5.3 `industry_events_daily`

用途：存储行业事件与催化摘要。

建议字段：

- `id` bigint primary key
- `trade_date` date not null
- `industry_id` varchar(64) not null
- `event_date` date not null
- `event_title` varchar(255) not null
- `event_summary` text not null
- `event_type` varchar(64)
- `priority_rank` integer default 0
- `source_batch_id` varchar(64) not null
- `data_version` varchar(64) not null
- `created_at` timestamp not null
- `updated_at` timestamp not null

索引建议：

- `idx_industry_events_trade_date`
- `idx_industry_events_industry_id`

## 6. 结果快照层

### 6.1 `industry_opportunity_daily`

用途：存储行业机会评分与首页榜单核心结果。

建议字段：

- `id` bigint primary key
- `trade_date` date not null
- `industry_id` varchar(64) not null
- `opportunity_score` numeric(10,2) not null
- `trend_score` numeric(10,2) not null
- `capital_score` numeric(10,2) not null
- `valuation_score` numeric(10,2) not null
- `risk_level` varchar(16) not null
- `label` varchar(32) not null
- `summary` text not null
- `tags_json` jsonb
- `methodology_json` jsonb
- `focus_reason` text
- `source_batch_id` varchar(64) not null
- `data_version` varchar(64) not null
- `created_at` timestamp not null
- `updated_at` timestamp not null

### 6.2 `homepage_snapshot_daily`

用途：存储首页页面级聚合快照，减少接口实时拼装。

建议字段：

- `id` bigint primary key
- `trade_date` date not null
- `snapshot_key` varchar(64) unique not null
- `snapshot_payload` jsonb not null
- `status` varchar(32) not null default 'published'
- `source_batch_id` varchar(64) not null
- `data_version` varchar(64) not null
- `created_at` timestamp not null
- `updated_at` timestamp not null

说明：

- `snapshot_payload` 直接承载首页行业榜单、重点行业卡片、热力图、热门基金映射等聚合结构。

### 6.3 `industry_detail_snapshot_daily`

用途：存储行业详情页聚合快照。

建议字段：

- `id` bigint primary key
- `trade_date` date not null
- `industry_id` varchar(64) not null
- `snapshot_payload` jsonb not null
- `status` varchar(32) not null default 'published'
- `source_batch_id` varchar(64) not null
- `data_version` varchar(64) not null
- `created_at` timestamp not null
- `updated_at` timestamp not null

唯一约束建议：

- `(trade_date, industry_id, data_version)`

### 6.4 `fund_compare_daily`

用途：存储基金对比页使用的标准结果快照。

建议字段：

- `id` bigint primary key
- `trade_date` date not null
- `fund_id` varchar(64) not null
- `return_metrics_json` jsonb not null
- `risk_metrics_json` jsonb not null
- `fee_rate` numeric(8,4)
- `aum` numeric(18,4)
- `inception_date` date
- `top_holdings_json` jsonb
- `concentration_label` varchar(32)
- `tracking_deviation_note` text
- `source_batch_id` varchar(64) not null
- `data_version` varchar(64) not null
- `created_at` timestamp not null
- `updated_at` timestamp not null

唯一约束建议：

- `(trade_date, fund_id, data_version)`

### 6.5 `watchlist_change_summary_daily`

用途：存储观察页需要的最近变化摘要与待跟踪提示。

建议字段：

- `id` bigint primary key
- `trade_date` date not null
- `item_type` varchar(32) not null
- `item_id` varchar(64) not null
- `status_label` varchar(64)
- `latest_change` text
- `watch_hint` text
- `source_batch_id` varchar(64) not null
- `data_version` varchar(64) not null
- `created_at` timestamp not null
- `updated_at` timestamp not null

## 7. 批次与发布控制层

### 7.1 `data_publish_batch`

用途：记录每次盘后批次的发布状态。

建议字段：

- `id` bigint primary key
- `batch_id` varchar(64) unique not null
- `trade_date` date not null
- `pipeline_stage` varchar(64) not null
- `publish_status` varchar(32) not null
- `published_at` timestamp
- `rollback_from_batch_id` varchar(64)
- `message` text
- `created_at` timestamp not null
- `updated_at` timestamp not null

说明：

- 前端只读取 `publish_status = 'published'` 且最新的一版。

## 8. 治理与日志层

### 8.1 `job_run_log`

用途：记录任务运行日志。

建议字段：

- `id` bigint primary key
- `job_name` varchar(128) not null
- `batch_id` varchar(64) not null
- `trade_date` date
- `run_status` varchar(32) not null
- `started_at` timestamp not null
- `ended_at` timestamp
- `processed_count` integer
- `error_message` text
- `log_path` varchar(255)
- `created_at` timestamp not null
- `updated_at` timestamp not null

### 8.2 `data_quality_result`

用途：记录质量规则执行结果。

建议字段：

- `id` bigint primary key
- `batch_id` varchar(64) not null
- `trade_date` date not null
- `rule_name` varchar(128) not null
- `rule_level` varchar(32) not null
- `check_status` varchar(32) not null
- `sample_payload` jsonb
- `message` text
- `created_at` timestamp not null
- `updated_at` timestamp not null

### 8.3 `source_ingestion_audit`

用途：记录采集源的批次审计信息。

建议字段：

- `id` bigint primary key
- `source_name` varchar(128) not null
- `batch_id` varchar(64) not null
- `trade_date` date not null
- `file_path` varchar(255)
- `row_count` integer
- `checksum` varchar(128)
- `ingestion_status` varchar(32) not null
- `message` text
- `created_at` timestamp not null
- `updated_at` timestamp not null

## 9. 前端接口与表映射建议

### 首页

- 接口：`/api/industries`
- 主要来源：
  - `homepage_snapshot_daily`
  - `industry_opportunity_daily`

### 行业详情页

- 接口：`/api/industries/{id}`
- 主要来源：
  - `industry_detail_snapshot_daily`
  - `industry_events_daily`

### 基金发现页

- 接口：`/api/funds`
- 主要来源：
  - `fund_master`
  - `fund_daily_metrics`

### 基金对比页

- 接口：`/api/compare`
- 主要来源：
  - `fund_compare_daily`

### 观察页

- 接口：`/api/watchlist-summary`
- 主要来源：
  - `watchlist_change_summary_daily`

## 10. 实施建议

1. 第一阶段先建主数据表、日指标表、结果快照表和日志表。
2. 页面快照可先用 `jsonb` 承载，后续再根据查询压力决定是否拆分。
3. 所有 SQL 迁移都应带版本号，后续支持平滑演进。
4. 表结构以服务当前前端页面为准，后续新增需求再扩展，不提前预埋过多无用字段。
