# Render 一键部署指引（境外 Node PaaS · 内网小范围使用）

配套：`render.yaml`（Blueprint）· `Dockerfile`（备选/其它平台）· `next.config.ts`（standalone）。

## 前置（已替你验证的部分）

- 本地 `npm run build`（standalone）通过，`npm test` 31/31 通过；
- 已按 Dockerfile 布局做**本地生产冒烟**：standalone 运行目录 = `.next/standalone + .next/static + public + data`，
  `/`、`/monitor`、`/api/intel?province=四川`、`/api/policies?province=北京`、地图 geojson 全部 200；
- 仓库 `TLEON111/opc-policy-map` main 已含全部部署文件（commit `a744a5f`）。

## 你只需做的 3 步（约 5 分钟）

1. 打开 https://render.com → Sign Up（可用 GitHub 账号登录）
2. Dashboard → 右上 **New + → Blueprint** → 选择 GitHub 仓库 `TLEON111/opc-policy-map`
   （首次需 Install Render on GitHub 并授权该仓库）
3. 点 **Apply Blueprint**，等待约 3–5 分钟首次构建
   → 完成地址形如 `https://opc-policy-map.onrender.com`（Render 自带 HTTPS）

> 若页面没有自动出现 Web Service，也可手动：New + → Web Service → 选仓库 →
> Runtime: Docker（用 Dockerfile）或 Node（Build `npm ci && npm run build` / Start `npm start`）→ Deploy。

## 日常行为

- **数据更新**：GitHub Actions 每天北京 10:00 跑 `npm run collect` 并提交
  `data/pool/*.json` → push 触发 Render 自动重新部署（`autoDeploy: true`），站点即可看到最新待核验池。
- **免费档休眠**：Render 免费实例闲置约 15 分钟会休眠，首次访问有几秒冷启动；
  办公室白天常用可把 `render.yaml` 的 `plan` 改为 `starter`（约 7 美元/月）避免休眠。

## 排查速查

| 现象 | 处理 |
|---|---|
| 首次访问很慢/超时 | 免费档冷启动；稍后刷新或升级 plan |
| 500：找不到 `data/pool` | 检查部署产物含 `data/`（Dockerfile 已 COPY；原生 Node 需仓库根目录含 data/） |
| 端口不通 | 平台会注入 `PORT`，`npm start` 已支持 `${PORT:-3000}`；无需自行指定 3000 |
| 修改后不自动部署 | 检查仓库 Settings→Webhooks 里 Render 的 push 钩子是否成功触发 |

## 其它平台（同一套仓库即可）

- **Railway**：railway.app → New Project → Deploy from GitHub 选本仓库；Railpack/Dockerfile 自动识别，会注入 PORT。
- **Fly.io**：`fly launch`（会读取 Dockerfile），`fly deploy` 即可。
- **自托管 VPS**：`docker build -t opc-policy-map . && docker run -p 3000:3000 opc-policy-map`，前面加 nginx 反代 HTTPS。
