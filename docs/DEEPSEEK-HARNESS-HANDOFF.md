# DeepSeek Harness 项目交接文档

> 项目：全国 OPC 政策地图（OPC Policy Map）
>
> 交接日期：2026-09-04（Asia/Shanghai）
>
> 代码仓库：<https://github.com/TLEON111/opc-policy-map>
>
> 默认分支：`main`
>
> 线上站点：<https://opcmap.netlify.app>
>
> 当前前端基线提交：`141c6c9 feat(ui): refresh OPC policy map experience`

## 1. 接手时先做什么

在项目根目录依次执行：

```bash
git status --short
git log --oneline -30
npm install
npm test
npm run check:data
npm run lint
npm run typecheck
npm run build
```

开始修改前必须阅读：

1. `AGENTS.md`：本仓库的工作规则与 Next.js 16 特别约束；
2. `README.md`：运行、部署、采集和数据规模；
3. 本文件：以当前代码为准的接手状态；
4. `docs/CODEX-HANDOFF.md`：历史架构与踩坑记录，但其中第 3、4、6、8 节的部分数字和待办已过期。

特别说明：旧交接文档中的“`/monitor` 待核验池读取 Supabase”和“全站关键词搜索”已经分别由 `71b1f0f`、`88aab89` 完成，不要重复开发。

## 2. 产品现状

这是一个面向中国大陆 31 个省级地区的 OPC（AI 一人公司）政策与情报站，当前包含：

- `/`：全国政策地图、地区政策面板、全局搜索、最新 OPC 情报；
- `/monitor`：申报提醒、31 省覆盖矩阵、已核验情报筛选、待核验池、来源状态、收录日志；
- `/api/policies?province=山东`：按地区读取本地政策并附带全国政策；
- `/api/intel?kind=&province=&q=`：按类别、地区和关键词读取统一情报流；
- 每日官方来源巡检、待核验池写入、GitHub 自动提交和 Supabase 同步。

当前数据基线：

- 已核验政策 `37` 条，其中全国政策 `2` 条；
- 已核验跟进情报 `29` 条；
- 统一已核验情报流共 `66` 条（政策投影 + 跟进情报）；
- 待核验池 `11` 条；
- 官方来源注册表 `64` 个，其中 `54` 个启用自动巡检、`10` 个待接入；
- 测试基线：`19` 个测试文件、`50` 项测试。

数据口径必须保持诚实：巡检命中不等于已核验；未收录不等于不存在；不要编造 URL、日期、文号、金额或政策结论。

## 3. 技术栈与目录

- Next.js `16.3.4`（App Router、Turbopack、`output: "standalone"`）；
- React `19.2.8`、TypeScript `6.0.3`；
- Apache ECharts `6.1.0`；
- Tailwind CSS `4.3.3`，主要视觉样式集中在 `app/globals.css`；
- Vitest + Testing Library；
- Supabase PostgREST，只读访问使用 anon key，写入脚本使用 service key；
- Netlify 托管，GitHub Actions 执行巡检和数据同步。

关键目录：

```text
app/
  page.tsx                 首页服务端组件
  monitor/page.tsx         监控页服务端组件，force-dynamic
  api/policies/route.ts    政策接口，Supabase 优先、本地回退
  api/intel/route.ts       情报接口，Supabase 优先、本地回退
components/
  PolicyExplorer.tsx       地图与右侧面板的联动状态
  ChinaMap.tsx             ECharts 中国地图
  PolicyDrawer.tsx         地区政策面板
  GlobalSearch.tsx         首页全局搜索
  intel/                   情报筛选、卡片、覆盖矩阵
data/
  verified-policies.ts     已核验政策权威源
  verified-intel.ts        已核验跟进情报权威源
  monitor-sources.ts       官方来源注册表
  pool/                    本地待核验池与巡检报告
lib/
  policies.ts              本地政策查询与省份汇总
  intel.ts                 情报聚合、待核验池与监控概览
  supabase.ts              只读 PostgREST 客户端
  supabase-mappers.ts      数据库行与前端模型映射
scripts/                   采集、校验、同步、bootstrap 生成
supabase/                  schema 与可重复执行的 bootstrap SQL
.github/workflows/         每日巡检和数据同步工作流
```

## 4. 当前数据流

### 政策地图

1. 首页通过 `getProvinceSummaries()` 生成 31 省地图汇总；
2. 用户点击地图、省份下拉或快捷地区按钮；
3. `PolicyExplorer` 请求 `/api/policies?province=...`；
4. 配置 Supabase 时接口优先读取 `policies` 表，失败自动回退 `data/verified-policies.ts`；
5. 右侧 `PolicyDrawer` 展示本地政策和全国政策。

### 全局搜索与情报浏览

1. 首页 `GlobalSearch` 以 GET 方式跳转到 `/monitor?q=关键词#intel-feed`；
2. `IntelFeedExplorer` 请求 `/api/intel?kind=&province=&q=`；
3. 统一情报流由政策投影为 `kind=policy`，再与四类跟进情报合并；
4. 关键词匹配标题、摘要、标签、发文机关、文号和要点，大小写不敏感。

### 待核验池与来源状态

1. `/monitor` 调用 `getMonitorRuntimeData()`；
2. 生产环境配置 Supabase 时，优先读取 `intel_pool` 表；
3. 远程失败或本地未配置时，回退 `data/pool/pool.json` 与 `last-report.json`；
4. 远程模式的来源状态是“池快照”：有待核验命中的来源显示为命中，其余启用来源显示为暂无命中；它不是实时网络健康探测；
5. 本地模式使用最近一次巡检报告，可显示可达或失败。

### 仓库、Supabase 与部署

- GitHub 仓库是代码和已核验数据的权威源；
- push 到 `main` 后，Netlify 自动构建部署；
- `.github/workflows/collect.yml` 每天北京时间 10:00 巡检来源、更新 `data/pool/*.json`、尝试自动提交并同步 Supabase；
- `.github/workflows/sync-supabase.yml` 仅在 `data/**`、采集脚本或 `supabase/**` 变化时触发；
- API 使用 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 读取；
- `scripts/sync-supabase.ts` 使用 `SUPABASE_URL` 与 `SUPABASE_SERVICE_KEY` 写入。

## 5. 2026-09-04 前端状态

本轮已完成纯前端视觉重构，没有修改数据库、API、采集器或真实业务数据：

- 首页改为统一的蓝白政策平台视觉；
- 新增复用品牌标识 `components/BrandLogo.tsx`；
- 地图与右侧政策面板合并为一个主工作区；
- 地图色阶、选中态、图例和移动端布局统一；
- 首页增加动态统计、全局搜索和最新情报表格；
- `/monitor` 复用品牌头部并统一视觉；
- 政策/申报/解读/动态/资源标签使用柔和的语义色；
- 增加跳过导航链接和必要的无障碍标记；
- 桌面与窄屏已经人工验证，无横向溢出；地图点击、地区联动与搜索跳转正常。

视觉入口主要在：

- `app/globals.css`：设计令牌、页面布局、响应式覆盖；
- `app/page.tsx`：首页信息层级；
- `app/monitor/page.tsx`：监控页结构；
- `components/ChinaMap.tsx`：地图配色与选择态；
- `components/PolicyDrawer.tsx`：地区面板；
- `components/intel/IntelKindChip.tsx`：情报类别色。

继续调整 UI 时，应保留现有 fetch、筛选、地图联动和真实数据绑定，避免把动态统计改成写死的展示数字。

## 6. 密钥与权限边界

仓库中不得出现任何真实密钥。

- 可以直接进行：页面样式、前端组件、无障碍、响应式和对应测试；
- 修改数据库 schema、Supabase RLS、API 契约、采集器、来源注册表、已核验政策或真实情报前，必须先向用户说明影响并取得明确授权；
- 需要 Supabase、Netlify、GitHub 或 DeepSeek 平台密钥时，必须先向用户索取；
- `SUPABASE_SERVICE_KEY` 只能进入本地安全环境或 GitHub Secrets，绝不能使用 `NEXT_PUBLIC_` 前缀；
- 若以后加入 DeepSeek 问答，DeepSeek API key 只能放服务器端环境变量，不能下发浏览器。

## 7. 已知限制与风险

1. `docs/CODEX-HANDOFF.md` 的池数量、测试数量和第 6 节前两项待办已经过期，以本文件和实际命令输出为准。
2. 首页和监控页的部分汇总数据仍由仓库内已核验文件生成；`/api/*` 才是 Supabase 远程优先。未来若要让全部汇总实时读取 Supabase，需要先设计一致性与失败回退，再取得 API/数据层修改授权。
3. `ProvinceSummary.lastVerifiedAt` 当前为固定日期 `2026-09-03`，首页“数据更新”沿用该值；不要在没有数据口径的情况下改成系统当天日期。
4. 远程 `intel_pool` 不能表达完整的来源网络健康，只能表达池内命中快照。若要实时健康度，需要新增数据结构或持久化巡检报告，属于数据/API 改动。
5. ECharts GeoJSON 来自 `china-map-geojson@1.0.4`，正式大规模公开使用前仍需做地图数据合规审查。
6. `output: "standalone"` 的生产启动方式是 `node .next/standalone/server.js`；不要把 `next start` 当作 standalone 产物的入口。
7. 自动采集可能遇到反爬、跳转、页面结构变化或并发提交冲突；待接入来源不要伪装成可用来源。

## 8. 建议的下一阶段

以下事项尚未实施，按价值和风险排序：

1. 在用户授权数据与采集改动后，逐一修复 10 个待接入官方来源，并补充城市级官方来源覆盖；
2. 在用户授权数据层改动后，为巡检报告设计可持久化的 Supabase 结构，使来源健康度不再依赖池命中推断；
3. 补齐西藏、宁夏及 `data/research/PENDING.md` 中的官方候选，但必须人工核验原文后再入库；
4. 可选的 DeepSeek 智能问答：先做已核验数据检索和引用，再做服务端生成；必须具备来源引用、输入长度限制、限流和失败降级；
5. 可选的管理后台：需要先确定身份策略、Supabase Auth 和 RLS，不能直接暴露 service key。

不要把管理后台、RAG、向量库或新依赖作为无关任务的顺带重构。优先小步提交，每一步都保持验证全绿。

## 9. 完成标准与交付习惯

每个开发步骤至少满足：

```bash
npm test
npm run check:data
npm run lint
npm run typecheck
npm run build
git diff --check
```

提交前确认 `git diff --name-only` 没有超出授权范围；禁止 force push。若远端有新提交，先停止并检查差异，不要覆盖他人改动。

向用户汇报时写清：改了什么、涉及哪些文件、验证结果、是否使用平台密钥、是否改变真实数据，以及仍存在的风险。
