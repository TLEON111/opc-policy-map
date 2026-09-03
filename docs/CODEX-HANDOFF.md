# Codex / 其它 Agent 交接说明（HANDOFF）

> 阅读顺序：先读本文件 + README.md，再看 `git log --oneline -20` 与 `docs/`、`data/research/PENDING.md`。
> 本文件由开发会话生成，用于让另一个编码 Agent（Codex 等）在同一文件夹无缝接手。

## 1. 项目一句话
「全国 OPC（AI 一人公司）政策地图与情报监控台」：中国 31 省政策地图 + /monitor 情报台 + 每日自动巡检官方政策源。
前端 Netlify（https://opcmap.netlify.app），后端数据 Supabase，代码仓库 GitHub（TLEON111/opc-policy-map，分支 main）。

## 2. 当前架构（谁做什么）
- **GitHub 仓库 = 权威源**：代码、已核验数据（`data/verified-policies.ts` 37 条、`data/verified-intel.ts` 27 条）、待核验池（`data/pool/pool.json`）、巡检脚本、CI 工作流。
- **GitHub Actions**：`collect.yml`（每天北京 10:00 = UTC `0 2 * * *`，巡检 44 个官方源→去重写入 pool→自动提交→同步 Supabase→跑 test+check:data）；`sync-supabase.yml`（push 改动 `data/**` 时自动 upsert 到 Supabase）。
- **Supabase 后端**：表 `policies / intel_items / intel_pool / changelog`，RLS=anon 只读；`/api/policies`、`/api/intel` **远程优先**读 Supabase（配置 `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` 时），失败自动回退本地数据。
- **Netlify**：托管整套 Next.js（页面 + API），连 GitHub 自动部署；已配 env：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`。
- **注意**：/monitor 的待核验池列表、来源健康度目前仍读**本地文件**（未走 Supabase），是已知过渡点（见第 7 节待办 1）。

## 3. 常用命令
```bash
npm run dev          # 本地开发（localhost:3000）
npm test             # vitest（当前 35 项）
npm run check:data   # 数据质量校验（离线）
npm run collect      # 巡检采集器（联网，写 data/pool）
npm run check:supabase  # Supabase 健康检查（需 URL+anon env）
npm run sync:supabase   # 仓库数据 → Supabase（需 SUPABASE_URL+SERVICE_KEY；--dry-run 本地核对）
npm run gen:bootstrap   # 重新生成 supabase/bootstrap.sql（数据变更后跑）
npm run build        # next build（output: standalone）
# 生产 standalone 启动（next start 与 standalone 不兼容）：
PORT=3000 node .next/standalone/server.js
```

## 4. 环境变量 / 密钥（不写进代码）
- 仓库 GitHub Secrets：`SUPABASE_URL`、`SUPABASE_SERVICE_KEY`（供 Actions 同步）。
- Netlify env：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`。
- 本地模板见 `.env.example`。**绝不把 service/secret 提交或外发**；如需新密钥，向用户索取并只放入 Secrets/平台 env。

## 5. 踩坑速查（改代码前必读）
1. Next 16：`output:"standalone"` 下别用 `next start`，用 standalone server.js。
2. 服务端 fs 读 `data/pool/*.json` 依赖进程 cwd；部署需把 `data/` 放在运行目录。
3. PG SQL：字符串/数组元素一律单引号；双引号是标识符（曾致 42703）。
4. GitHub Actions：`secrets` 不能用于 `if:` 表达式 → bash 判空；自动提交需 `permissions: contents: write`。
5. cron 用 UTC：北京 10:00 = `0 2 * * *`。
6. `/api/intel` 远程必须把 policies 投影并入（kind=policy），否则与本地情报流不等价（lib/supabase-mappers.mapPolicyRowToIntel）。
7. 平台怪问题优先走官方 UI（如 Netlify API 触发构建曾产出 404）。
8. 数据诚实原则：不编造 URL/日期/金额/文号；巡检命中≠已核验；未收录≠不存在。

## 6. 数据流（改动如何全自动生效）
本地改代码/数据 → `git push main` →
① `supabase-sync` 自动 upsert 到 Supabase；② Netlify 自动重新部署；
③ 每日 collect 自动巡检并同步库。前端列表类实时读库；统计栏随部署更新。

## 7. 当前待办（按优先级，供接手者继续）
1. /monitor 待核验池与来源健康度改为读 Supabase（`intel_pool`），全站统一走后端（改动集中在 lib/intel 与页面调用）。
2. （可选）Supabase Auth + 管理后台：登录后网页增删改政策（写库），发挥后端"写"能力。
3. （可选）把 CHANGELOG/相关文档已随每次变更维护；保持 vitest/tsc/lint/build 全绿再提交。
4. 细节参考 `data/research/PENDING.md`（数据候补/盲区）与 `docs/`。

## 8. 给接手 Agent 的建议第一步
阅读本文件与 README → `git log --oneline -20` 看最近改动 → 本地跑 `npm test` 确认基线 →
从第 7 节待办第 1 项开始，小步提交，每步保持四道闸门（test/tsc/lint/build）全绿。
