# 新电脑拉取后启动指南

这份说明适用于从 GitHub 仓库 clone 下来的源码目录。

仓库地址：

```text
https://github.com/wildcxy/industry-fund-opportunity-platform.git
```

## 1. 安装基础环境

在新电脑上先安装：

- Git
- Node.js，确保可以运行 `npm.cmd`
- Python 3.11，确保可以运行 `python`
- PostgreSQL

项目初始化脚本默认使用下面的数据库配置：

```text
PostgreSQL 用户：postgres
PostgreSQL 密码：123456
数据库名：game_data
连接串：postgresql://postgres:123456@localhost:5432/game_data
```

如果你的 PostgreSQL 密码或安装路径不同，可以在运行初始化脚本时传参数覆盖。

## 2. 拉取仓库

```powershell
git clone https://github.com/wildcxy/industry-fund-opportunity-platform.git
cd industry-fund-opportunity-platform
```

## 3. 初始化项目

在仓库根目录运行：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\portable-setup-windows.ps1
```

脚本会自动完成：

- 写入 `backend\.env`
- 创建或复用 `game_data` 数据库
- 导入 `db\game_data_dump.sql`
- 安装后端 Python 依赖到 `backend\.packages`
- 执行 `npm.cmd install`
- 初始化 `runtime\` 运行目录

如果 PostgreSQL 不是默认路径，可以显式指定：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\portable-setup-windows.ps1 `
  -PsqlExe "C:\Program Files\PostgreSQL\18\bin\psql.exe" `
  -CreatedbExe "C:\Program Files\PostgreSQL\18\bin\createdb.exe"
```

如果 Python 不在 PATH 里，可以显式指定：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\portable-setup-windows.ps1 `
  -PythonExe "C:\Path\To\python.exe"
```

## 4. 启动后端

新开一个 PowerShell 窗口，在仓库根目录运行：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\backend\scripts\run-api.ps1
```

后端默认地址：

```text
http://127.0.0.1:8000
```

健康检查：

```text
http://127.0.0.1:8000/health
```

## 5. 启动前端

再新开一个 PowerShell 窗口，在仓库根目录运行：

```powershell
npm.cmd run dev
```

前端默认地址：

```text
http://127.0.0.1:3000
```

建议先打开：

```text
http://127.0.0.1:3000/portfolio
```

## 6. 常见问题

### 找不到 `.packages`

说明后端依赖还没有安装。重新运行：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\portable-setup-windows.ps1
```

或者只补装 Python 依赖：

```powershell
python -m pip install -r .\backend\requirements.txt -t .\backend\.packages
```

### 数据库连接失败

检查 PostgreSQL 是否已启动，并确认 `backend\.env` 里的 `DATABASE_URL` 是否和本机数据库一致。

默认值：

```text
DATABASE_URL=postgresql://postgres:123456@localhost:5432/game_data
```

### 前端端口被占用

可以换端口启动：

```powershell
npm.cmd run dev -- -p 3001
```

然后访问：

```text
http://127.0.0.1:3001
```

### 不要使用 `source\` 路径

从 GitHub clone 下来的仓库根目录就是源码根目录，所以命令都在仓库根目录执行。

`README_FIRST.md` 里的 `source\` 路径是旧的便携迁移包场景使用的。
