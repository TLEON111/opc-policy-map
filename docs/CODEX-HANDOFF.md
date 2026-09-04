# Codex / 其它 Agent 交接说明（HANDOFF）

> 更新日期：2026-09-04（世界时间）
> 阅读顺序：本文件 → `README.md` → `git log --oneline -30` → `docs/`、`data/research/PENDING.md`。
> 目的：让另一个编码 Agent（Codex / Claude 等）在本文件夹无痛接手，不丢上下文、不破坏既有约定。

---

## 1. 一句话
「全国 OPC（AI 一人公司）政策地图与情报监控台」：31 省政策地图 + `/monitor` 情报台 + 每天自动巡检 44 个官方政策源。
**线上**：前端 https://opcmap.netlify.app（Netlify）；**后端数据**：Supabase；**代码**：GitHub `TLEON111/opc-policy-map`（main）。
站点名注意：**真实站点是 opcmap（不是 opcma）**。

## 2. 架构与数据流（现状）
- GitHub 仓库 = **权威源**（代码、已核验数据、待核验池、CI）。
- push → main：① Netlify 自动构建部署前端；② `supabase-sync`（若改动在 `data/**`）自动 upsert 到 Supabase。
- 每日 10:00（北京）= cron `0 2 * * *`（UTC）：`collect.yml` 巡检 → 去重写 `data/pool/pool.json` → 自动提交 → 同步 Supabase → `npm test` + `check:data`。
- Supabase 表：`policies / intel_items / intel_pool / changelog`，RLS=anon 只读。
- API（`/api/policies`、`/api/intel`）**远程优先**：配置了 `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` 就走 Supabase PostgREST，失败自动回退本地数据；未配置则全程本地（开发/测试等价）。
- 已知过渡点：`/monitor` 的待核验池列表、来源健康度仍读**本地文件**（未走 Supabase），见第 6 节待办 1。

## 3. 数据规模（基线）
- policies = 37 条（含全国 2 条）；intel_items = 29 条；intel_pool = 8 条；changelog 若干。
- 核验日期基线 `2026-09-03/04`（scripts/check-data.ts 的 `RECENT_VERIFY_DATES` 会随日期推进**需要手动补新日期**）。

## 4. 常用命令
```bash
npm run dev            # 本地开发 localhost:3000
npm test               # vitest（当前 35 项，11 文件）
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # next build（output: standalone）
npm run check:data     # 数据质量校验（离线）
npm run collect        # 巡检采集器（联网）
npm run check:supabase # Supabase 健康检查（需 URL+anon env）
npm run sync:supabase  # 仓库→Supabase（需 URL+service；--dry-run 本地核对）
npm run gen:bootstrap  # 重新生成 supabase/bootstrap.sql
# 生产 standalone 启动（不要用 next start）：
PORT=3000 node .next/standalone/server.js
```

## 5. 密钥与环境（平台里，仓库无明文）
- GitHub Secrets：`SUPABASE_URL`、`SUPABASE_SERVICE_KEY`（Actions 同步用）。
- Netlify env：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`。
- 本地模板 `.env.example`。**禁止把 service/secret 写进仓库或提交**；新密钥向用户索取并只进 Secrets/平台 env。

## 6. 当前待办（按优先级，供接手者直接开工）
1. **/monitor 待核验池与来源健康度改为读 Supabase `intel_pool`**（改动集中在 `lib/intel.ts` 的池读取 + `/monitor` 页面与 API 联动；需处理 `last-report` 概念——可新增表字段/表或在同步时合并）。
2. **全站关键词搜索框（方案 A）**：/monitor 顶部加搜索框，走已有 `/api/intel?q=`、`/api/policies?province=`（纯前端+已有接口，零后端成本）。
3. **DeepSeek 智能问答（方案 B，可选增强）**：先做 A 后叠 B——用户提问 → 从 64 条已核验数据检索（推荐 Supabase pgvector 向量检索，RAG）→ 调 DeepSeek API 生成带来源的回答。要点：**API key 只放服务器 env（不是 NEXT_PUBLIC）**，走新路由 `/api/chat`（Netlify Functions 承载），必须做**限流+输入长度限制**（免费档函数配额有限）。
4. **管理后台 `/admin`（可选）**：Supabase Auth 登录 + 政策/情报增删改页面（写库权限用登录身份+RLS，而非公开 anon）；登录身份策略要重新设计 RLS。
5. **并行开发纪律**：多人/多 Agent 并行时先写 `docs/SPLIT-PLAN.md`（文件归属 + 接口契约 + mock 测试），写代码建议 git worktree/分支隔离，避免同一工作区互相覆盖。
6. 数据候选/盲区跟踪：`data/research/PENDING.md`（待回填：成都计划 412、乌市高新十条官方源、南宁人社全文等；西藏/宁夏留白）。

## 7. 踩坑速查（改代码前必读）
1. Next 16 `output: "standalone"`：不要用 `next start`，用 `node .next/standalone/server.js`。
2. 服务端 fs 读 `data/pool/*.json` 依赖 cwd；部署产物需把 `data/` 放在运行目录。
3. PG/SQL：字符串与数组元素一律**单引号**（双引号是标识符，曾致 42703）。
4. GitHub Actions：`secrets` **不能用于 `if:`**（用 bash 判空）；自动提交需 `permissions: contents: write`；cron 用 UTC。
5. `gh workflow run` 按**文件名**触发（如 `collect.yml`），不是 display name。
6. /api/intel 远程必须把 policies 投影并入（`mapPolicyRowToIntel`），否则 kind=policy 为空，与本地不等价。
7. Netlify：API 触发的构建产物可能异常（404）→ 以 Dashboard 部署为准；站名容易搞混（opcmap ≠ opcma）。
8. 数据诚实原则：不编造 URL/日期/金额/文号；巡检命中≠已核验；未收录≠不存在；新增情报记得把核验日加进 `RECENT_VERIFY_DATES`。

## 8. 给接手 Agent 的建议第一步
1. `git log --oneline -30` + 读 README 与本文件；
2. `npm test` 确认基线（35 项）全绿；
3. 从第 6 节待办 1 或 2 开始；**小步提交**，每步保持 test/typecheck/lint/build 全绿；
4. 需要平台操作（Supabase/Netlify/DeepSeek key）时**先询问用户**，不要自行在平台上做危险变更。

## 9. 本期已完成大事记（压缩版）
- 政策 22→37、情报 5→29（核验制、原文可回溯、31 省检索全覆盖记录）；
- 采集器（44 源、栏目页发现、已收录去重）、数据质量校验、35 项测试；
- Supabase 迁移（schema/bootstrap/seed/远程读取层/自动同步）、Netlify 上线 opcmap 并接 Supabase env；
- 全自动闭环（GitHub Secrets 配置后 push/每日自动同步+自动部署）；
- 9/4 新收录：安徽行动方案官方解读、雄安 OPC 社区观察。
