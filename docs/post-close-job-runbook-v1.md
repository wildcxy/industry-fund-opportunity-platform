# 行业基金机会捕捉平台盘后任务清单 V1

## 1. 文档信息

- 文档名称：行业基金机会捕捉平台盘后任务清单 V1
- 文档版本：V1.0
- 适用对象：后端工程师、数据工程师、运维工程师、架构师
- 关联文档：
  - `E:\game\docs\data-architecture-v1.md`
  - `E:\game\docs\database-schema-v1.md`

## 2. 目标

定义交易日盘后从采集到发布的完整任务链路，使任务可以：

1. 定时执行
2. 单任务重跑
3. 失败不覆盖旧版本
4. 在 Windows 环境下稳定运行

## 3. 盘后总流程

推荐按以下顺序执行：

1. 交易日检查
2. 主数据同步
3. 基金指标采集
4. 行业指标采集
5. 行业事件采集
6. 原始数据审计入库
7. 标准化加工
8. 行业机会评分计算
9. 页面快照生成
10. 数据质量校验
11. 批次发布
12. 日志归档与告警

## 4. 任务清单

### 4.1 `market-calendar-check`

目标：判断是否为交易日。

输入：

- 本地日历配置
- 交易日历源

输出：

- 是否执行当日主流程
- `batch_id`

失败策略：

- 若日历源不可用，可回退至本地交易日历文件

建议时间：

- `18:00`

### 4.2 `master-data-sync`

目标：同步基金主数据与行业主数据。

输入：

- 基金基础资料源
- 行业主题配置源

输出：

- `fund_master`
- `industry_master`
- `industry_fund_mapping`

失败策略：

- 失败可重跑，不阻塞后续读取上一版主数据

建议时间：

- `18:20`

### 4.3 `fund-metrics-ingestion`

目标：采集基金盘后日级指标。

输入：

- 基金净值
- 收益与风险指标源
- 规模与费率信息

输出：

- 原始文件归档
- `source_ingestion_audit`
- 标准化输入中间表或文件

失败策略：

- 单源失败记录错误并允许单独补采

建议时间：

- `19:00`

### 4.4 `industry-metrics-ingestion`

目标：采集行业盘后日级指标。

输入：

- 行业指数
- 估值位置
- 资金热度代理指标

输出：

- 原始文件归档
- `source_ingestion_audit`

建议时间：

- `19:20`

### 4.5 `industry-events-ingestion`

目标：采集行业事件和催化摘要。

输入：

- 政策类来源
- 产业资讯来源
- 内部维护标签

输出：

- `industry_events_daily`

建议时间：

- `19:40`

### 4.6 `standardize-and-load`

目标：将原始结果标准化后写入日指标表。

输入：

- 采集原始文件

输出：

- `fund_daily_metrics`
- `industry_daily_metrics`

失败策略：

- 若标准化失败，不进入评分与发布阶段

建议时间：

- `20:00`

### 4.7 `opportunity-score-daily`

目标：计算行业机会评分和标签。

输入：

- `industry_daily_metrics`
- `industry_events_daily`

输出：

- `industry_opportunity_daily`

说明：

- 该任务输出首页榜单与行业详情页的核心基础结果

建议时间：

- `20:30`

### 4.8 `fund-compare-snapshot-daily`

目标：生成基金对比页快照。

输入：

- `fund_master`
- `fund_daily_metrics`

输出：

- `fund_compare_daily`

说明：

- 对比数据以盘后批量预计算为主，不在 API 层临时计算

建议时间：

- `20:45`

### 4.9 `page-snapshot-build`

目标：生成页面聚合快照。

输入：

- `industry_opportunity_daily`
- `fund_compare_daily`
- `industry_events_daily`
- `fund_master`
- `fund_daily_metrics`

输出：

- `homepage_snapshot_daily`
- `industry_detail_snapshot_daily`
- `watchlist_change_summary_daily`

建议时间：

- `21:00`

### 4.10 `data-quality-check`

目标：执行阻断级与告警级质量校验。

输入：

- 结果快照表
- 主数据表
- 指标表

输出：

- `data_quality_result`

阻断条件示例：

1. 首页快照为空
2. 行业评分记录数不足
3. 基金对比结果缺少关键字段

建议时间：

- `21:20`

### 4.11 `snapshot-publish`

目标：将当日成功结果标记为前端可读版本。

输入：

- 质量校验结果

输出：

- `data_publish_batch`

策略：

1. 只有质量校验通过时才发布
2. 发布失败不覆盖上一成功版本

建议时间：

- `21:40`

### 4.12 `notify-and-archive`

目标：输出日报、归档日志与告警。

输入：

- `job_run_log`
- `data_quality_result`
- `data_publish_batch`

输出：

- 日志文件
- 邮件或消息告警

建议时间：

- `21:50`

## 5. 重跑策略

### 5.1 可重跑维度

必须支持按以下维度重跑：

1. 按交易日重跑
2. 按任务名重跑
3. 按批次号重跑

### 5.2 重跑顺序建议

1. 采集失败时优先重跑采集任务
2. 指标异常时重跑标准化与加工任务
3. 快照异常时重跑页面快照任务
4. 校验通过但发布失败时仅重跑发布任务

## 6. 输出日志建议

每个任务至少输出以下信息：

1. `job_name`
2. `batch_id`
3. `trade_date`
4. `run_status`
5. `started_at`
6. `ended_at`
7. `processed_count`
8. `error_message`
9. `log_path`

## 7. 人工处理指引

### 场景一：单个数据源失败

1. 查看 `source_ingestion_audit`
2. 确认具体失败源
3. 仅重跑对应采集任务

### 场景二：评分结果异常

1. 查看 `data_quality_result`
2. 确认是指标缺失还是计算逻辑问题
3. 重跑 `standardize-and-load` 与 `opportunity-score-daily`

### 场景三：发布失败

1. 保持上一成功批次为当前生效版本
2. 仅重跑 `snapshot-publish`

## 8. 实施建议

1. 初期先将每个任务实现为独立脚本或独立命令入口。
2. 任务输入输出都要带 `batch_id`，避免跨批次污染。
3. 先把“日更跑稳”作为第一目标，再考虑任务编排平台升级。
