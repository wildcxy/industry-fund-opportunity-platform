# 可移植迁移说明

本包用于把“行业基金机会捕捉与个人持仓决策辅助平台”迁移到另一台 Windows 电脑，并让 Codex/GPT-5.5 能快速理解当前项目状态。

## 包内内容

- `source/`：项目源码，不包含 `node_modules`、`.next`、Python 本地依赖包、运行日志等机器相关目录。
- `db/game_data_dump.sql`：当前 PostgreSQL 数据库导出，包含已采集基金、用户持仓、观察池相关快照、组合策略结果等数据。
- `db/restore-db.ps1`：数据库恢复脚本示例。
- `portable-setup-windows.ps1`：推荐的一键恢复脚本，会写入 `.env`、恢复数据库、安装前后端依赖。
- `PORTABLE_MANIFEST.md`：迁移包摘要、关键路径、启动命令和验收步骤。

## 是否需要带数据库

建议带上。原因：

- 当前真实基金快照、14 只支付宝持仓、基金代码匹配、昨日涨跌、组合策略结果都在 PostgreSQL。
- 如果不恢复数据库，前端能启动，但基金发现、我的持仓、我的观察、策略辅助会退回“需要重新搜索和采集”的状态。
- AKShare 可重新采集，但受网络、接口稳定性和反爬影响，迁移时直接恢复数据库更稳。

## 新电脑前置要求

- Node.js 20+。
- Python 3.11。
- PostgreSQL 16+ 或 18。
- PowerShell。
- 网络可访问 AKShare 依赖的数据源，后续刷新真实基金数据时需要。

## 推荐恢复目录

推荐解压到：

```powershell
E:\game
```

现在脚本已经尽量改成相对路径；如果放在其他目录也可以，但 `.env`、前端命令和数据库 URL 仍需按本机实际情况检查。

## 恢复步骤

### 推荐一键恢复

如果 PostgreSQL 超级用户为 `postgres`，密码为 `123456`，直接在解压后的迁移包根目录运行：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\portable-setup-windows.ps1
```

这个脚本会自动完成：

- 识别 `source/` 为项目根目录。
- 写入 `source/backend/.env`，默认数据库连接为 `postgresql://postgres:123456@localhost:5432/game_data`。
- 创建 `game_data` 数据库，如果已存在则复用。
- 恢复 `db/game_data_dump.sql`。
- 初始化 `runtime/` 目录。
- 安装后端 Python 依赖到 `source/backend/.packages`。
- 执行 `npm.cmd install` 安装前端依赖。

如果新电脑 PostgreSQL 密码不是 `123456`，运行：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\portable-setup-windows.ps1 -DatabasePassword "你的密码"
```

如果 PostgreSQL 安装路径不同，但 `psql` 已加入 PATH，不需要额外参数；否则传入：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\portable-setup-windows.ps1 -PsqlExe "D:\PostgreSQL\bin\psql.exe" -CreatedbExe "D:\PostgreSQL\bin\createdb.exe"
```

### 手动恢复

1. 解压迁移包，把 `source/` 中的内容作为项目根目录。

2. 安装前端依赖：

```powershell
cd E:\game
npm.cmd install
```

3. 创建后端 `.env`：

```powershell
Copy-Item E:\game\backend\.env.transfer.example E:\game\backend\.env
```

如果 PostgreSQL 密码不是 `123456`，修改 `backend\.env` 中的 `DATABASE_URL`。

4. 安装后端依赖：

```powershell
cd E:\game\backend
python -m pip install -r requirements.txt -t .packages
```

如果新电脑使用的是 pgAdmin 自带 Python，也可以设置：

```powershell
$env:PYTHON_EXE="C:\Program Files\PostgreSQL\18\pgAdmin 4\python\python.exe"
```

5. 创建数据库并恢复数据：

```powershell
createdb -U postgres game_data
psql -U postgres -d game_data -f E:\game\db\game_data_dump.sql
```

如果使用包内脚本：

```powershell
powershell.exe -ExecutionPolicy Bypass -File E:\game\db\restore-db.ps1
```

6. 启动后端：

```powershell
powershell.exe -ExecutionPolicy Bypass -File E:\game\backend\scripts\run-api.ps1
```

访问：

```text
http://127.0.0.1:8000/health
http://127.0.0.1:8000/api/funds
```

7. 启动前端：

```powershell
cd E:\game
npm.cmd run dev
```

访问：

```text
http://127.0.0.1:3000
```

## 验收清单

- `/portfolio` 能看到 14 只持仓基金。
- `/watchlist` 能看到持仓基金进入观察。
- `/funds` 能看到真实基金，且昨日涨跌保留两位小数。
- 点击基金名称能进入 `/funds/[fundCode]` 详细复盘页。
- `/portfolio` 点击“读取最近策略”能看到组合体检、长期持有资产复盘、高波动主题控仓复盘。
- 后端 `/api/portfolio/decision-assist` 返回 `enhancedCount = 14` 或接近当前持仓数量。

## Codex 接手提示

给新电脑上的 Codex/GPT-5.5 读取以下文件：

- `PORTABLE_MANIFEST.md`
- `docs/portable-transfer-guide.md`
- `docs/agents/financial-product-manager-agent.md`
- `docs/agents/solution-architect-agent.md`
- `docs/agents/backend-solution-architect-agent.md`
- `docs/portfolio-decision-assistant-v1.md`
- `backend/README.md`
- `README.md`

下一步如果要继续开发，优先保持“真实基金数据 + 盘后刷新 + 个人持仓决策辅助”的主线，不要退回纯 Mock 演示版。
