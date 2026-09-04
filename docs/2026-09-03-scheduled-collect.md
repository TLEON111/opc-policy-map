# OPC 巡检定时运行方案（cron / GitHub Actions）

配套 `npm run collect`（scripts/collect-intel.ts）。巡检结果：
- 命中但已在待核验池/已核验库的 URL → **自动去重**（不重复写入）；
- 命中关键词且全新的 URL → 写入 `data/pool/pool.json`（待核验池）；
- 每个来源的最近状态写入 `data/pool/last-report.json`（/monitor 来源健康表实时读取）；
- 每个列表页的「疑似栏目页」会被自动发现并写入报告的 `discoveredColumns`
  （**仅建议、不自动登记**，人工挑站内"政策文件/通知公告"类栏目页后可补进 `data/monitor-sources.ts`）。

## 1. 本地定时（crontab，macOS/Linux）

```cron
# 每天 UTC 01:50（北京时间 09:50）启动巡检，约 10:00 前完成；日志写入 ~/logs/opc-collect.log
50 1 * * * cd /Users/sky/Desktop/全国opc地图 && npm run collect >> ~/logs/opc-collect.log 2>&1
```

要点：
- `npm run collect` 会访问 54 个政府站点，单次约 30–90 秒，请勿设置过密（建议 ≥ 每 6 小时一次）。
- 生产站点若用 `next build` 静态产物，数据（pool/last-report）变化后需重新 build/部署；本地 `next dev` 每次请求实时读取，无需重启。
- 巡检≠核验：人工核验通过的线索再写入 `data/verified-*.ts`。

## 2. GitHub Actions（需先把目录纳入 git 并推送到 GitHub 仓库）

启用前：
1. `git init` + 推送到 GitHub（项目当前尚未初始化 git）；
2. 按需开启 Actions 权限；让机器人账号/`secrets.GITHUB_TOKEN` 有提交权限（默认对仓库提交可用）。

工作流模板已放于 `.github/workflows/collect.yml`：每天 UTC 02:10 巡检，
数据有变化时自动提交 pool / last-report /（可选）注册表与已核验文件，
方便通过 PR 或在 CI 里直接跑 `vitest` 校验。

> 合规提醒：巡检对象均为政府公开栏目页，请遵守站点 robots/访问频率、设置合理 UA 与限速；
> 对外抓取请确保不违反目标站点使用条款，并注意数据仅作信息聚合、以官方原文为准。
