# 新电脑拉取后启动指南

这份说明适用于从 GitHub clone 下来的源码目录。

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

默认数据库配置：

```text
PostgreSQL 用户：postgres
PostgreSQL 密码：123456
数据库名：game_data
连接串：postgresql://postgres:123456@localhost:5432/game_data
```

如果你的 PostgreSQL 密码不是 `123456`，后面恢复数据库和写 `.env` 时需要同步改成你的本机密码。

## 2. 拉取仓库

```powershell
git clone https://github.com/wildcxy/industry-fund-opportunity-platform.git
cd industry-fund-opportunity-platform
```

后续命令都在仓库根目录执行。

## 3. 安装前端依赖

```powershell
npm.cmd install
```

## 4. 安装后端依赖

项目后端依赖安装到 `backend\.packages`，启动脚本会从这里加载依赖。

```powershell
python -m pip install -r .\backend\requirements.txt -t .\backend\.packages
```

## 5. 初始化运行目录

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\backend\scripts\init-runtime-directories.ps1
```

这个脚本会创建 `runtime\logs`、`runtime\data-archive`、`runtime\manual-drop` 等本地运行目录。

## 6. 配置后端环境变量

复制示例配置：

```powershell
Copy-Item .\backend\.env.example .\backend\.env
```

然后打开 `backend\.env`，至少确认这一行和你的 PostgreSQL 配置一致：

```text
DATABASE_URL=postgresql://postgres:123456@localhost:5432/game_data
```

如果你使用默认配置，可以直接用上面的值。

## 7. 恢复数据库

使用仓库里的数据库备份恢复 `game_data`：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\db\restore-db.ps1
```

如果 PostgreSQL 密码不同：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\db\restore-db.ps1 -DatabasePassword "你的密码"
```

如果 PostgreSQL 不在默认安装路径，可以显式指定：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\db\restore-db.ps1 `
  -PsqlExe "C:\Program Files\PostgreSQL\18\bin\psql.exe" `
  -CreatedbExe "C:\Program Files\PostgreSQL\18\bin\createdb.exe"
```

## 8. 启动后端

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

## 9. 启动前端

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

## 常见问题

### 找不到 `.packages`

说明后端依赖还没有安装。重新运行：

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
