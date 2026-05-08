# 先读这个：迁移到新电脑

本迁移包已经内置默认数据库配置：

```text
PostgreSQL 用户：postgres
PostgreSQL 密码：123456
数据库名：game_data
连接串：postgresql://postgres:123456@localhost:5432/game_data
```

新电脑安装好 PostgreSQL、Node.js、Python 3.11 后，在迁移包根目录运行：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\portable-setup-windows.ps1
```

脚本会自动：

- 写入 `source/backend/.env`
- 创建/复用 `game_data` 数据库
- 导入 `db/game_data_dump.sql`
- 安装后端依赖到 `source/backend/.packages`
- 执行 `npm.cmd install`
- 初始化 `runtime/` 目录

启动后端：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\source\backend\scripts\run-api.ps1
```

启动前端：

```powershell
cd .\source
npm.cmd run dev
```

验收地址：

```text
http://127.0.0.1:8000/health
http://127.0.0.1:3000/portfolio
```

更多说明见：

- `PORTABLE_MANIFEST.md`
- `portable-transfer-guide.md`
- `source/docs/portable-transfer-guide.md`
