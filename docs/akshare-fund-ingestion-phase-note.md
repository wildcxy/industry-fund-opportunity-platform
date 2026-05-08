# AKShare 基金采集接入说明 V1

## 1. 本轮范围

本轮只接入两类真实数据能力，并保持现有前端与快照链路不变：

1. 基金主数据：生成 `master/fund_master.csv`
2. 部分公募/ETF 日度指标：生成 `daily/fund_daily_metrics.csv`

以下能力继续保留现状，不在本轮自动化范围内：

1. `industry_master` 与 `industry_fund_mapping` 仍可人工维护
2. `industry_daily_metrics` 与 `industry_events_daily` 仍走 manual-drop
3. 行业评分、基金对比快照、页面快照、发布批次不改职责

## 2. 架构师约束

接入方式严格遵循“采集入口增强，不改下游口径”：

1. AKShare 只负责抓取并写入 dropzone CSV
2. `master_data_sync`、`fund_metrics_ingestion`、`standardize_and_load` 继续沿用现有职责
3. 前端接口继续只消费 PostgreSQL 中已发布的快照结果
4. manual-drop 保留为并行兜底通道，不被替代

## 3. 新增组件

### 3.1 Provider 层

新增目录：

1. [base.py](/E:/game/backend/providers/base.py)
2. [akshare_provider.py](/E:/game/backend/providers/akshare_provider.py)

职责拆分：

1. `base.py`
   页面无关的数据契约，定义基金覆盖池、主数据行、日度指标行
2. `akshare_provider.py`
   负责 AKShare 调用、随机 sleep、分批、重试、字段清洗、收益与波动估算

### 3.2 新增 Job

新增两个入口 job：

1. [akshare_master_fetch.py](/E:/game/backend/jobs/akshare_master_fetch.py)
   读取基金覆盖池，生成 `master/fund_master.csv`
2. [akshare_fund_daily_fetch.py](/E:/game/backend/jobs/akshare_fund_daily_fetch.py)
   读取基金覆盖池，生成 `daily/fund_daily_metrics.csv`

## 4. 覆盖池策略

当前不直接抓全市场，而是先抓“产品明确覆盖的基金池”。覆盖池文件：

[fund_universe.csv](/E:/game/backend/templates/coverage/fund_universe.csv)

字段说明：

1. `fund_id`
2. `fund_code`
3. `industry_id`
4. `theme`
5. `tracking_target`
6. `enabled`

这样可以确保：

1. 不因为 AKShare 全量主数据过大而拉取过慢
2. 不把行业归因完全交给外部源黑盒决定
3. 后续可以按 PRD 逐步扩基金池，而不影响现有页面口径

## 5. 反爬虫与稳定性策略

Provider 层统一执行以下策略：

1. 单请求随机 sleep
   默认 `1.5s ~ 3.0s`
2. 按基金池分批抓取
   默认每批 `8` 只
3. 批间冷却
   默认 `6s`
4. 单请求失败重试
   默认 `3` 次，带退避等待
5. 不因单个基金失败阻塞整个后续链路的设计可以在下一轮继续加强

当前配置位于：

1. [settings.py](/E:/game/backend/config/settings.py)
2. [.env.example](/E:/game/backend/.env.example)

## 6. 环境变量

关键环境变量如下：

1. `AKSHARE_ENABLE`
2. `AKSHARE_SLEEP_MIN_SECONDS`
3. `AKSHARE_SLEEP_MAX_SECONDS`
4. `AKSHARE_RETRY_COUNT`
5. `AKSHARE_RETRY_BACKOFF_SECONDS`
6. `AKSHARE_CHUNK_SIZE`
7. `AKSHARE_CHUNK_COOLDOWN_SECONDS`
8. `AKSHARE_HISTORY_LOOKBACK_DAYS`
9. `AKSHARE_FUND_UNIVERSE_PATH`

建议首轮实盘配置：

1. `AKSHARE_ENABLE=true`
2. `AKSHARE_CHUNK_SIZE=5`
3. `AKSHARE_SLEEP_MIN_SECONDS=2.0`
4. `AKSHARE_SLEEP_MAX_SECONDS=4.0`
5. `AKSHARE_CHUNK_COOLDOWN_SECONDS=8.0`

## 7. Windows 运行顺序

在 Windows 上建议先跑 AKShare 抓取，再复用原有链路：

1. `powershell -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 -JobModule akshare_master_fetch`
2. `powershell -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 -JobModule akshare_fund_daily_fetch`
3. `powershell -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 -JobModule master_data_sync`
4. `powershell -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 -JobModule fund_metrics_ingestion`
5. `powershell -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 -JobModule standardize_and_load`
6. 后续继续运行 `fund_compare_snapshot_daily`、`page_snapshot_build`、`snapshot_publish`

## 8. 当前真实度边界

本轮接入后，数据“开始使用真实 AKShare 源”，但仍有边界：

1. 基金池是我们显式维护的覆盖池，不是全市场自动发现
2. 行业映射仍由产品口径维护
3. 基金收益、波动、回撤来自盘后历史估算，不是实时指标
4. 持仓摘要可能因为源限制出现缺失，前端应允许为空

这与 PRD 的“前端演示版 + 盘后可解释数据”定位一致，不偏离当前范围。
