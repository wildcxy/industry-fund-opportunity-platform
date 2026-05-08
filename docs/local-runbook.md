# 本地启动手册

## 1. 前端启动

在 PowerShell 中执行：

```powershell
cd E:\game
npm.cmd run dev
```

默认访问地址：

```text
http://127.0.0.1:3000
```

当前前端会优先访问后端：

```text
http://127.0.0.1:8000
```

如果后端没有启动，前端的 `app/api/*` 会回退到演示数据，所以页面仍然能打开，但部分基金会显示为演示样例。

## 2. 后端启动

在另一个 PowerShell 窗口中执行：

```powershell
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-api.ps1
```

默认访问地址：

```text
http://127.0.0.1:8000
```

健康检查：

```text
http://127.0.0.1:8000/health
```

基金接口：

```text
http://127.0.0.1:8000/api/funds
```

行业接口：

```text
http://127.0.0.1:8000/api/industries
```

## 3. 真实数据与演示数据的判断

如果前端基金卡片或表格显示：

```text
真实快照
```

说明该基金来自后端 PostgreSQL 快照。

如果显示：

```text
演示样例
```

说明该基金来自前端 fallback 数据，通常是因为该基金暂未进入真实采集池，或者后端没有生成对应快照。

## 4. AKShare 盘后采集

当前 AKShare 已在 `E:\game\backend\.env` 中开启：

```text
DATA_COLLECTION_MODE=akshare
AKSHARE_ENABLE=true
```

基金采集池文件：

```text
E:\game\backend\templates\coverage\fund_universe.csv
```

当前真实采集只会处理这个文件中的基金。后续要支持用户搜索添加基金，需要把用户选中的基金写入候选池，再触发单只基金采集任务。

## 5. 常用后端任务

运行某个后端任务：

```powershell
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 -JobModule seed_demo_data
```

AKShare 主数据采集：

```powershell
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 -JobModule akshare_master_fetch
```

AKShare 基金日度指标采集：

```powershell
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 -JobModule akshare_fund_daily_fetch
```

长期持有成本快照：

```powershell
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-job.ps1 -JobModule fund_holding_cost_snapshot_daily
```

## 6. 下一步建议

优先实现“基金搜索并添加到真实采集池”：

1. `GET /api/funds/search?q=基金名称或代码`
2. `POST /api/funds/candidates`
3. `POST /api/funds/{fund_code}/collect`
4. 前端基金发现页增加搜索添加入口和采集状态

这样你买过或关注的基金，例如嘉实全球产业升级、南方北证50，可以先被搜索出来，再进入真实数据采集链路。

