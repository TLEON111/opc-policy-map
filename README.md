# OPC Policy Map

中国 OPC / AI / 创业政策地图与情报监控看板。

## 本地运行

```bash
npm install
npm run dev
```

数据质量校验（离线、不修改文件，CI 也会执行）：

```bash
npm run check:data
```

打开 `http://localhost:3000`（政策地图）与 `http://localhost:3000/monitor`（情报监测面板）。

## 部署（单服务 Node 托管）

本项目是**一套 Next.js 全栈应用**：页面（前端）+ `/api/policies`、`/api/intel`（数据接口）+ `/admin`（后台管理）运行在同一个 Node 服务里，**推荐整体单服务部署**（一个站点承载三部分，无需拆站）。

- **推荐线上站点（Vercel）**：导入 GitHub 仓库 `TLEON111/opc-policy-map` 即自动部署（Next.js 自动识别），每次 push 到 `main` 自动发布。
  - **环境变量**（Vercel → Project → Settings → Environment Variables，选 All scopes）：
    - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`：让 `/api` 走 Supabase PostgREST（可选的读取层，不配则用仓库内置数据）；
    - `ADMIN_PASSWORD`：后台登录密码（必填，否则 `/admin` 禁用）；
    - `ADMIN_SESSION_SECRET`：后台会话签名密钥（强烈建议）；
    - `GITHUB_ADMIN_TOKEN`：后台写 GitHub 数据的 PAT（contents 读写；未配则后台只读）；
    - `GITHUB_REPO`：默认 `TLEON111/opc-policy-map`，通常无需配置。
- **备用：Netlify**（旧方案，站点 `opcmap`）：`netlify.toml` + `@netlify/plugin-nextjs` 部署。
- **备用：Render/Railway/Fly.io**（Node PaaS）：连接 GitHub 仓库自动部署，`render.yaml` 见仓库。
- **Docker 自托管**：见根目录 `Dockerfile`（Next `output: "standalone"` + 运行时 `data/` 打包）。

要点：
- `/monitor` 与 API 动态读取 `data/pool/*.json`（相对运行目录）；Vercel 侧已通过
  `outputFileTracingIncludes` 把 `data/pool/**` 打进产物，Docker/Render 侧随目录打包；
- GitHub Actions 每日 09:50（北京）启动巡检，约 10:00 前完成数据更新并自动提交，
  推送会触发平台自动部署；`collect-guard.yml` 每 2 小时兜底补跑防漏；

### Supabase（后端数据，可选启用）

- Schema：`supabase/schema.sql`（policies / intel_items / intel_pool / changelog，RLS：anon 可读）。
- **一键灌数（无需密钥）**：Supabase → SQL Editor → 粘贴运行 `supabase/bootstrap.sql`
  （已含 schema + 当前全部已核验数据，幂等；数据变更后执行 `npm run gen:bootstrap` 重新生成）。
- 种子/同步：`npm run sync:supabase`（需 `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` 环境变量；`--dry-run` 可本地核对）。
- 读取层：为 API 配置 `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` 后，
  `/api/policies`、`/api/intel` 自动改走 Supabase PostgREST（失败自动回退本地数据）；
  未配置时保持本地数据模式。见 `.env.example`。
- 自动同步：push 数据变更或每日巡检后自动 upsert 到 Supabase
  （`.github/workflows/sync-supabase.yml` 与 `collect.yml` 内置步骤；需仓库 Secrets `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`，未配置时自动跳过）。


## 信息监控与收纳

站点不只展示已核验政策，还内置一条「监控 → 收纳 → 核验」管线：

1. **官方来源注册表**：`data/monitor-sources.ts` 登记 65 个官方监控源
   （全国/省级政府、市场监管/经信门户及重点城市、区县源）；
   URL 经 2026-09-03/04 真实 HTTP 探测（以自动巡检实际使用的抓取方式为准），
   **63 个可自动巡检、2 个待接入**（湖北/甘肃省级站点 412 反爬，需人工/浏览器巡检）；
   河北/黑龙江/西藏/宁夏改接省政府门户、山东/深圳改用 http 入口、广西改接区政府门户、甘肃新增兰州入口后均已启用。
2. **巡检采集器**：`npm run collect`
   以浏览器 UA 抓取来源列表页，扫描 OPC / 一人公司 / 超级个体等关键词：
   全新命中去重写入 `data/pool/pool.json`（待核验池），已收录/在池的命中自动跳过；
   同时自动发现各站「政策文件/通知公告」类栏目页（仅报告、不自动登记），
   并输出来源健康度报告 `data/pool/last-report.json`。
   定时运行方案（cron / GitHub Actions）见 `docs/2026-09-03-scheduled-collect.md`。
3. **人工核验**：只有核对过原文（URL 可达、标题一致）的条目才进入已核验库——
   `data/verified-policies.ts`（政策文件，参与地图着色）
   与 `data/verified-intel.ts`（申报动态 / 解读问答 / 落地动态 / 资源活动）。

### 五类信息

`policy` 政策文件 · `application` 申报受理 · `interpretation` 解读问答 ·
`news` 落地动态 · `resource` 资源活动。情报流在 `/monitor` 浏览：
**31 省覆盖矩阵**（直接政策/相关政策/情报动态/待跟踪四态，点击省份联动筛选），
支持按类别、地区、关键词（标题/摘要/标签/文号）筛选；
`/api/intel?kind=&province=&q=` 提供数据接口。

### 调研候选

`data/research/` 与 `docs/2026-09-03-research-north-china-8-regions-opc.md`
保存联网检索得到的候选清单（含 URL 与置信度），逐条核验后陆续入库；
未通过核验的条目一律留在候选/待核验层，不冒充已核验。

## 已核验覆盖（截至 2026-09-03）

- 政策文件 39 条，地图覆盖省级地区：全国、北京（市级+海淀/石景山/朝阳）、上海（杨浦）、
  天津（市级/武清解读）、江苏（省级+无锡）、浙江（杭州/宁波）、安徽、福建、山东（省级+青岛）、
  广东（省级+深圳/海珠）、广西（南宁，人社+市监）、海南、重庆、四川、陕西（省级+西安）、云南、
  河南（郑州）、湖北（省/武汉）、湖南（长沙经开区/永州）、辽宁（省级+大连）、新疆 等，含国家级 2 条。
- 四类跟进情报 35 条（申报通知/解读/落地动态/资源活动），覆盖共 29 个省级地区，
  含贵州（贵阳）、青海（西宁）、甘肃（兰州）、吉林（长春净月）、江西（南昌）、黑龙江（哈尔滨）、
  河北（雄安/石家庄）、山西、内蒙古、新疆（乌鲁木齐）等情报级覆盖。
- 尚未核验到任何可靠官方条目的省域：西藏、宁夏（2026-09-04 复检仍未发现官方专项源，
  详见 data/research/PENDING.md，“未收录 ≠ 不存在”）。

## 地图与 API

- Apache ECharts 中国省级地图：点击省份经 `/api/policies?province=重庆` 获取本地+全国政策；
  深色=直接 OPC 政策，浅色=相关支撑，灰色=暂未核验。
- 右侧政策面板含加载态、错误态、空态；桌面与移动端响应式布局。

## 合规说明

- 已核验条目均带官方原文链接，逐条核对于核验日；申报窗口/额度可能动态调整，
  以原文与主管部门最新口径为准，本页不构成申报或法律意见。
- 地图 GeoJSON 由 `china-map-geojson@1.0.4` 导出，仅用于开发演示，
  正式上线前必须替换为经合规审查的数据源。
- 巡检命中 ≠ 已核验：采集器只写待核验池，请勿把命中线索直接视为已发布政策。
