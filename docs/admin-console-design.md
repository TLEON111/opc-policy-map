# OPC 政策地图 · 后台管理系统设计方案

> 状态：设计阶段（P0 范围已确认，待实现）
> 关联仓库：`TLEON111/opc-policy-map`

## 1. 背景与目标

当前站点的数据维护完全依赖「手改源码文件 + `git push`」：

- 政策库 `data/verified-policies.ts`、情报库 `data/verified-intel.ts`、
  监控来源 `data/monitor-sources.ts`、更新日志 `data/changelog.ts` 均为 TS 源码；
- 待核验池 `data/pool/pool.json` 由巡检器写、人工手改；
- 巡检（`npm run collect`）、同步 Supabase（`npm run sync:supabase`）、
  数据校验（`npm run check:data`）都是命令行脚本。

后台管理系统的目标：把这些「手改文件 + 跑命令」的动作，变成**带认证、带界面、可审计**的增删改与一键操作，降低维护门槛与误操作风险。

## 2. 现状数据流（背景）

```
Git 仓库（权威源）
   │  GitHub Actions collect.yml（每日 09:50 巡检，写 pool/last-report）
   │  sync-supabase.yml（push data/** 时 upsert 到 Supabase）
   ▼
Supabase（后端镜像：policies / intel_items / intel_pool / changelog / source_checks）
   │  Netlify 构建部署（push main 触发）
   ▼
前端（/ 政策地图 + /monitor 情报面板，只读）
```

要点：
- 权威源是 Git；Supabase 仅镜像；前端只读。
- `/api/policies`、`/api/intel` 只有 GET，无任何写接口。
- Supabase RLS 只允许 `anon` 读；写操作仅 service role（脚本）。

## 3. 需要纳入后台的板块（研究结论）

按数据流分四层，共 10 个板块：

### 第一层 · 内容数据（核心，替代手改文件）
1. **政策库管理** — `verified-policies.ts`（39 条）
   - 增删改：标题/文号/类别/标签/生效期/到期日；`relevance`（直接/相关，决定地图深浅色）；来源 URL；上下线状态。
2. **情报库管理** — `verified-intel.ts`（35 条，申报/解读/落地/资源四类）
   - 增删改：核验标记、置信度、来源、申报窗口、要点。
3. **待核验池 · 核验工作台**（最高频、最痛）
   - 池内线索（`pool.json`）人工核验后 **通过 → 转政策/情报入库**，或 **驳回/保留**；做成流程化表单，替代手写 TS。
4. **更新日志管理** — `changelog.ts` 增删改。

### 第二层 · 监控配置与运维
5. **监控来源注册表** — `monitor-sources.ts`（65 源）
   - 增删改、启停（`enabled`）、URL、层级、归属、备注。
6. **巡检与健康看板** — `pool/last-report.json` + Supabase `source_checks`
   - 查看最近/历史逐源体检；手动触发巡检（对应 `collect.yml`）。
7. **数据校验与同步状态** — 展示 `check:data` 结果、`sync:supabase` 状态、一键触发。

### 第三层 · 调研候选
8. **调研候选管理** — `data/research/*.md` + `PENDING.md`
   - 候选清单转池 / 直接入库 / 丢弃；收口「未收录 ≠ 不存在」留白说明。

### 第四层 · 横切
9. **认证与权限** — 后台登录，与公开只读站点隔离（写操作需 service role 或后台账号）。
10. **全局概览仪表盘** — 覆盖矩阵、政策/情报/池计数、最近活动、巡检健康总览。

## 4. 已确认的关键决策

| 决策点 | 结论 |
|---|---|
| 数据写入口 | **路线 A：Git 权威** —— 后台经 GitHub API 提交数据文件，复用现有 CI 同步 Supabase 并触发部署 |
| 后台形态 | **同站 `/admin` 子路由** + 写接口 + 登录，复用同一套 Next.js 应用 |
| 首期范围 | **P0**：待核验池核验工作台 + 政策库管理 + 情报库管理 |

## 5. 关键技术决策（待实现前细化）

### 5.1 数据层：内容数据从 TS 迁移到 JSON（推荐）
- 现状：policies / intel / sources / changelog 是 TS 源码，后台无法安全地程序化改写（改源码易破坏语法、引入类型错误）。
- 推荐：把这 4 类**内容数据**迁移为 JSON（`data/*.json`），TS 只保留类型与薄封装（`import data from "./x.json"`）。后台即可安全地读写 JSON 并通过 GitHub API 提交。
- 影响面：`lib/policies.ts`、`lib/intel.ts`、`scripts/{check-data,sync-supabase,gen-bootstrap,collect-intel}.ts`、`data/changelog.ts`、`data/monitor-sources.ts` 的读取方式需同步调整。
- 备选（不改数据层）：后台生成 TS 源码文本后提交——可行但脆弱，不推荐。

### 5.2 认证
- 方案：环境变量保存管理密码（如 `ADMIN_TOKEN`），后台登录后签发签名 cookie（HTTP-only）；写接口校验 cookie。
- 写 GitHub 需一个 PAT（`contents` scope），存 Netlify 环境变量 `GITHUB_ADMIN_TOKEN`，仅服务端使用，不外泄给前端。

### 5.3 写入链路（P0）
```
/admin 表单 → POST /api/admin/*（校验登录）
   → GitHub Contents API 读写文件（base64 + sha 乐观并发）
   → 提交 → push 触发 sync-supabase.yml + Netlify 部署
```
- 每次后台改动 = 一个可审计的 commit（建议带操作者标识）。

## 6. 分阶段实施计划

- **阶段 0（前置）**：内容数据 TS → JSON 迁移 + 薄封装；`check:data`/`sync:supabase` 等脚本适配；跑通测试。新增 `/api/admin/*` 骨架与登录。
- **阶段 1（P0）**：待核验池核验工作台 + 政策库管理 + 情报库管理（增删改经 GitHub API 提交）。
- **阶段 2（P1）**：监控来源注册表 + 巡检/健康看板（含手动触发）+ 更新日志管理。
- **阶段 3（P2）**：调研候选管理 + 校验/同步面板 + 概览仪表盘 + 认证细化（多账号/权限）。

## 7. 风险与边界

- **并发写**：GitHub Contents API 需带文件 `sha` 做乐观并发，避免覆盖他人改动。
- **部署延迟**：路线 A 的写操作有数秒到数十秒延迟（GitHub API + CI + 部署），后台需明确提示「已提交，稍后生效」。
- **合规**：后台只维护已核验与待核验数据，仍遵守「巡检命中 ≠ 已核验」「未收录 ≠ 不存在」的诚实性规则，不提供「伪造官方信息」的入口。
- **密钥**：`GITHUB_ADMIN_TOKEN` 仅存服务端环境变量；后台登录 cookie 签名密钥独立。
