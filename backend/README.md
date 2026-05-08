# 后端工程说明

当前后端已经按“盘后批处理 + PostgreSQL + 只读 API”的方案落地，可为前端 V1 提供演示与后续联调所需的数据能力。

## 当前范围

- `api/`：FastAPI 只读接口，面向首页、行业详情、基金发现、基金对比、观察摘要
- `jobs/`：盘后任务骨架与种子数据任务
- `db/`：数据库连接、查询模块、初始化 SQL
- `config/`：环境配置读取
- `scripts/`：Windows 下的初始化、启动与任务执行脚本

## 架构师 Agent

后端架构师 Agent 已可直接使用，说明文档位于：

- `E:\game\docs\agents\backend-solution-architect-agent.md`

它的职责是约束后端边界、数据链路、数据库设计、API 设计、Windows 部署与调度方式，默认不扩展到实时行情、交易或推荐系统。

## 当前已完成

1. PostgreSQL 默认数据库 `game_data` 已建好并完成初始化建表。
2. 后端核心表结构已经落库。
3. `seed_demo_data` 任务已经可运行，并已写入样例主数据、行业快照、基金快照、对比快照和观察摘要。
4. 只读 API 已经能从 PostgreSQL 返回真实数据，不再只是空壳占位。

## 已验证接口

- `GET /health`
- `GET /api/industries`
- `GET /api/industries/{industry_id}`
- `GET /api/funds`
- `GET /api/compare?ids=f1,f3,f4`
- `GET /api/watchlist-summary`

## Windows 初始化

默认依赖当前机器上的：

- PostgreSQL 18
- `C:\Program Files\PostgreSQL\18\pgAdmin 4\python\python.exe`

如果后续系统 Python 已配置到 PATH，可以再把脚本中的 Python 路径收敛为统一配置。

### 一键初始化

```powershell
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\bootstrap-backend.ps1
```

该脚本会执行：

1. 初始化运行目录
2. 安装依赖到 `backend/.packages`
3. 执行 `001_init_schema.sql`
4. 执行 `seed_demo_data`

## 手工执行步骤

### 1. 初始化运行目录

```powershell
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\init-runtime-directories.ps1
```

### 2. 安装依赖

```powershell
& "C:\Program Files\PostgreSQL\18\pgAdmin 4\python\python.exe" -m pip install -r E:\game\backend\requirements.txt -t E:\game\backend\.packages
```

### 3. 初始化数据库结构

```powershell
$env:PGPASSWORD='123456'
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -U postgres -d game_data -f E:\game\backend\db\sql\001_init_schema.sql
```

### 4. 写入样例数据

```powershell
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 -JobModule seed_demo_data
```

### 5. 启动 API

```powershell
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-api.ps1
```

启动后默认监听：

- `http://127.0.0.1:8000`

## 盘后任务建议顺序

真实数据阶段建议按以下顺序扩展：

1. `market_calendar_check`
2. `master_data_sync`
3. `fund_metrics_ingestion`
4. `industry_metrics_ingestion`
5. `industry_events_ingestion`
6. `standardize_and_load`
7. `opportunity_score_daily`
8. `fund_compare_snapshot_daily`
9. `page_snapshot_build`
10. `data_quality_check`
11. `snapshot_publish`

当前 `seed_demo_data` 的作用是替代上述链路，先给前端和接口联调提供稳定样例。

## 手工落地源导入方案

当前已经补上一条适合 Windows 本地环境的“手工落地源”链路。适用于：

1. 你从第三方终端、基金数据平台或内部导出工具拿到盘后 CSV
2. 先不直连外部 API
3. 希望先把采集、归档、审计、标准化和入库流程跑通

### Drop Zone 目录

盘后文件默认放到：

- `E:\game\runtime\manual-drop\<trade-date>\master\`
- `E:\game\runtime\manual-drop\<trade-date>\daily\`

其中 `<trade-date>` 例如：

- `2026-04-21`

### 模板文件

项目已经提供模板：

- `E:\game\backend\templates\manual-drop\master\fund_master.csv`
- `E:\game\backend\templates\manual-drop\master\industry_master.csv`
- `E:\game\backend\templates\manual-drop\master\industry_fund_mapping.csv`
- `E:\game\backend\templates\manual-drop\daily\fund_daily_metrics.csv`
- `E:\game\backend\templates\manual-drop\daily\industry_daily_metrics.csv`
- `E:\game\backend\templates\manual-drop\daily\industry_events.csv`

可以直接把模板复制到当天目录：

```powershell
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\copy-manual-drop-templates.ps1 -TradeDate 2026-04-21
```

### 导入顺序

1. 同步主数据
```powershell
$env:TRADE_DATE='2026-04-21'
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 -JobModule master_data_sync
```

2. 归档基金日度文件
```powershell
$env:TRADE_DATE='2026-04-21'
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 -JobModule fund_metrics_ingestion
```

3. 归档行业日度文件
```powershell
$env:TRADE_DATE='2026-04-21'
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 -JobModule industry_metrics_ingestion
```

4. 归档行业事件文件
```powershell
$env:TRADE_DATE='2026-04-21'
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 -JobModule industry_events_ingestion
```

5. 标准化并入库
```powershell
$env:TRADE_DATE='2026-04-21'
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 -JobModule standardize_and_load
```

### 当前已经实现的能力

1. 从手工 drop zone 读取盘后 CSV
2. 复制到 `runtime\data-archive\raw\<trade-date>\...`
3. 记录 `source_ingestion_audit`
4. 记录 `job_run_log`
5. 将基金日度、行业日度、行业事件标准化写入数据库

### 当前还没做的下一步

1. 基于真实导入数据重算 `industry_opportunity_daily`
2. 基于真实导入数据重建 `fund_compare_daily`
3. 重新生成首页、行业详情、观察摘要快照
4. 加上数据质量校验和发布切换

## 下一步建议

1. 先让前端切换到后端 API 读数，完成联调。
2. 再逐个替换盘后任务里的 TODO，接入真实采集与加工逻辑。
3. 最后把 Windows Task Scheduler 调度配置补齐，形成稳定的盘后批处理链路。
