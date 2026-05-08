# Windows 本地预览指南

## 1. 适用范围

本文用于在 Windows 环境下本地查看当前前端演示版，不涉及后端服务启动。

## 2. 启动步骤

1. 打开 PowerShell。
2. 进入项目目录：`cd E:\game`
3. 安装依赖：`npm.cmd install`
4. 启动前端开发环境：`npm.cmd run dev`
5. 在浏览器访问：`http://localhost:3000`

## 3. 建议查看路径

1. 首页：`http://localhost:3000`
2. 基金发现页：`http://localhost:3000/funds`
3. 基金对比页：`http://localhost:3000/compare`
4. 我的观察页：`http://localhost:3000/watchlist`
5. 行业详情页示例：`http://localhost:3000/industries/semiconductor`

## 4. 预览重点

1. 首页是否完整展示市场概览、机会榜单、重点行业卡片、基金映射和热力图。
2. 行业详情页是否展示机会结论卡、趋势与资金图表区、口径说明、事件时间线与基金映射。
3. 基金发现页切换筛选与视图模式后，URL 是否同步变化。
4. 基金对比页是否在 2 只以上基金时显示摘要、对比表、持仓与风格概览。
5. 观察页是否能展示空状态、排序和待跟踪提示。
