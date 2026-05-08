# 行业基金机会捕捉平台 Windows 调度与部署脚本方案 V1

## 1. 文档信息

- 文档名称：行业基金机会捕捉平台 Windows 调度与部署脚本方案 V1
- 文档版本：V1.0
- 适用对象：后端工程师、运维工程师、架构师
- 关联文档：
  - `E:\game\docs\data-architecture-v1.md`
  - `E:\game\docs\post-close-job-runbook-v1.md`

## 2. 目标

在 Windows 环境下为后续数据链路提供一套可实施的调度、脚本和部署约定，满足：

1. 盘后任务可定时执行
2. 前后端服务可托管运行
3. 日志、配置、数据归档分离
4. 出错后便于定位和重跑

## 3. 建议目录结构

建议统一采用以下目录：

- `E:\game`：应用代码目录
- `E:\game\runtime\config`：环境配置目录
- `E:\game\runtime\logs`：运行日志目录
- `E:\game\runtime\scripts`：调度脚本目录
- `E:\game\runtime\data-archive`：原始采集归档目录

子目录建议：

- `E:\game\runtime\logs\jobs`
- `E:\game\runtime\logs\api`
- `E:\game\runtime\logs\web`

## 4. 环境建议

### 4.1 基础软件

1. Node.js
2. Python 3.x
3. PostgreSQL
4. Git

### 4.2 服务托管建议

1. 前端 Web 服务：使用 PM2 for Windows 或 NSSM
2. API 服务：使用 PM2 for Windows 或 NSSM
3. 盘后任务：使用 Windows Task Scheduler 调度 PowerShell 启动脚本

## 5. PowerShell 启动脚本建议

### 5.1 统一脚本入口

建议将每个任务都封装为 PowerShell 启动脚本，统一处理：

1. 环境变量加载
2. 日志目录创建
3. 时间戳输出
4. 命令执行
5. 退出码透传

### 5.2 示例命名

- `run-market-calendar-check.ps1`
- `run-master-data-sync.ps1`
- `run-fund-metrics-ingestion.ps1`
- `run-industry-metrics-ingestion.ps1`
- `run-industry-events-ingestion.ps1`
- `run-standardize-and-load.ps1`
- `run-opportunity-score-daily.ps1`
- `run-fund-compare-snapshot-daily.ps1`
- `run-page-snapshot-build.ps1`
- `run-data-quality-check.ps1`
- `run-snapshot-publish.ps1`

### 5.3 脚本模板建议

```powershell
$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logDir = "E:\game\runtime\logs\jobs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$logFile = Join-Path $logDir "fund-metrics-ingestion_$timestamp.log"

Push-Location "E:\game"
try {
    Write-Output "[$(Get-Date -Format s)] job start" | Tee-Object -FilePath $logFile -Append
    python .\backend\jobs\fund_metrics_ingestion.py *> $logFile
    Write-Output "[$(Get-Date -Format s)] job success" | Tee-Object -FilePath $logFile -Append
}
finally {
    Pop-Location
}
```

## 6. Task Scheduler 任务建议

### 6.1 任务清单

建议在 Windows Task Scheduler 中建立以下任务：

1. `game-market-calendar-check`
2. `game-master-data-sync`
3. `game-fund-metrics-ingestion`
4. `game-industry-metrics-ingestion`
5. `game-industry-events-ingestion`
6. `game-standardize-and-load`
7. `game-opportunity-score-daily`
8. `game-fund-compare-snapshot-daily`
9. `game-page-snapshot-build`
10. `game-data-quality-check`
11. `game-snapshot-publish`

### 6.2 触发时间建议

| 任务名 | 触发时间 |
| --- | --- |
| `game-market-calendar-check` | 18:00 |
| `game-master-data-sync` | 18:20 |
| `game-fund-metrics-ingestion` | 19:00 |
| `game-industry-metrics-ingestion` | 19:20 |
| `game-industry-events-ingestion` | 19:40 |
| `game-standardize-and-load` | 20:00 |
| `game-opportunity-score-daily` | 20:30 |
| `game-fund-compare-snapshot-daily` | 20:45 |
| `game-page-snapshot-build` | 21:00 |
| `game-data-quality-check` | 21:20 |
| `game-snapshot-publish` | 21:40 |

### 6.3 执行命令建议

建议在 Task Scheduler 中统一使用：

- 程序：`powershell.exe`
- 参数：`-ExecutionPolicy Bypass -File "E:\game\runtime\scripts\run-xxx.ps1"`

## 7. Windows 服务运行建议

### 7.1 前端服务

前端建议继续以 Next.js 生产服务方式运行。

服务脚本示例：

- `npm.cmd run build`
- `npm.cmd run start`

### 7.2 API 服务

若后续 API 仍和 Next 同仓，可先放在同一进程内。
若后续拆为独立后端服务，建议单独托管。

### 7.3 重启策略

建议服务托管工具配置：

1. 崩溃自动拉起
2. 日志文件独立输出
3. 开机自动启动

## 8. 配置管理建议

### 8.1 配置文件目录

建议放在：

- `E:\game\runtime\config\.env.web`
- `E:\game\runtime\config\.env.api`
- `E:\game\runtime\config\.env.jobs`

### 8.2 配置项分类

1. 数据库连接
2. 外部数据源连接
3. 日志目录
4. 数据归档目录
5. 告警接收人

### 8.3 安全要求

1. 不把密钥直接写进仓库
2. 不在 PowerShell 脚本内硬编码数据库密码
3. 生产配置与开发配置分离

## 9. 日志与归档建议

### 9.1 日志分类

1. Web 日志
2. API 日志
3. Job 日志
4. 数据质量日志

### 9.2 归档策略

1. 原始数据按交易日归档
2. Job 日志按日归档
3. 数据质量结果持久化入库
4. 每周清理旧临时文件

## 10. 后续实施建议

1. 第一阶段先建立脚本目录和任务命名规范。
2. 第二阶段实现每个盘后任务的脚本骨架。
3. 第三阶段接入数据库和日志记录。
4. 第四阶段再进行真正的数据源接入与任务联调。
