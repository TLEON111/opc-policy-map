# OPC 信息监控与收纳系统设计

日期：2026-09-03
目标：把「全国 OPC 政策地图」从静态政策切片升级为可持续「监控 + 收纳」OPC 信息的情报看板。

## 1. 背景与缺口

现状问题：
- 信息类别单一：只收「政策文件」，缺申报/受理动态、解读问答、落地案例、资源活动。
- 覆盖窄：已核验库 22 条，约 15 省市有直接/相关政策，其余省份空白。
- 无持续渠道：数据靠一次性人工录入，没有「官方来源清单 + 定期巡检 + 待核验池」的机制。
- 详情不够结构化：缺申报窗口、联系方式、分层要点、原文可回溯性展示。

## 2. 术语

- **IntelItem（情报条目）**：任意一条与 OPC 相关的、带原文出处的信息单元。按 `kind` 分五类。
- **IntelSource（监控来源）**：注册表中的官方栏目/站点，巡检对象。
- **待核验池（Pool）**：巡检/检索发现但尚未人工核验的原始线索，`verified=false`。
- **已核验库（Verified）**：人工核对过原文、可回溯的条目，地图与监测页展示主体。

## 3. 五类信息（IntelKind）

| kind | 含义 | 典型内容 |
| --- | --- | --- |
| `policy` | 政策文件 | 措施/行动方案/意见，带文号、效力层级 |
| `application` | 申报/受理动态 | 补贴、Token/算力券、贷款、大赛报名：窗口期、材料、电话 |
| `interpretation` | 政策解读/问答 | 官方解读、办事指南、FAQ |
| `news` | 落地动态/案例 | OPC 社区挂牌、首张执照、园区试点、典型案例 |
| `resource` | 资源与活动 | 路演、创业驿站、培训、算力/模型等供给资源 |

分类标签便于页面按类别过滤；一条内容可多打 `tags`，但 `kind` 取主类。

## 4. 收纳状态机

```
官方栏目巡检 / 联网检索
   └─▶ Pool（待核验，verified=false, origin=registry-scan|web-research）
          └─ 人工核对原文 ─▶ Verified（verified=true, origin=manual, verifiedAt=当日）
```

- 巡检器只把「命中关键词 + 有真实 URL」的线索写入 Pool，绝不自封已核验。
- 已核验条目要求：`sourceUrl` 可打开且为官方域名、标题/日期/文号与页面一致、`verifiedAt` 记录核验日。

## 5. 数据文件布局

| 文件 | 内容 |
| --- | --- |
| `types/intel.ts` | IntelItem / IntelSource / IntelPoolEntry / 同步报告类型 |
| `data/monitor-sources.ts` | 监控来源注册表（官方栏目，2026-09-03 探测确认可访问） |
| `data/verified-intel.ts` | 人工核验后的情报条目（含非 policy 类别） |
| `data/pool/pool.json` | 待核验池（巡检器写入；提交快照保证可构建） |
| `scripts/collect-intel.ts` | 巡检器 CLI（Node ≥22 直接运行，erasable TS） |

来源注册表字段：`id / owner(省或全国) / name / kind / url / note / enabled / checkedAt? / reachable?`。

## 6. 巡检器行为（collect-intel.ts）

- 读取注册表，对每个 `enabled` 来源发起 GET（带浏览器 UA、限时 12s、跟随跳转）。
- 记录可达性（HTTP 状态）写入报告；仅对 2xx 页面做关键词命中扫描。
- 关键词集：`一人公司、OPC、人工智能一人公司、AI 一人公司、超级个体、未来星 OPC、OPC 创业、OPC 社区` 等（大小写不敏感）。
- 命中条目按 URL 去重写入 Pool：`{url,title,snippet,sourceId,keyword,foundAt,status:"pending"}`。
- 报告输出：来源总数/成功/失败、各来源 HTTP 状态、命中数、Pool 总数。
- 运行方式：`npm run collect`；绝不写入已验证文件。

## 7. 站点新增「监测与收纳」视图

- 新页面 `/monitor`（服务端组件）：
  1. 概览卡：监控来源数、可达数、五类情报条数、待核验池条数、最近核验时间。
  2. 五类分类筛选的「最新收录」列表（已核验），逐条展示文号/机构/日期/原文链接/要点/申报细节。
  3. 「待核验池」区块：巡检发现的线索列表（标题+来源+命中词），每条带「查看来源」。
  4. 来源健康度表：来源名、地区、URL、最近状态。
  5. 顶部导航加入口；首页新增「情报监测」区展示最近 5 条并链接到 /monitor。
- 新增 API：`/api/intel`（按 kind/province/verified 过滤，供客户端面板复用）。

## 8. 数据扩充策略

- 联网检索按省分组派发调研，产出「带 URL 的候选条目」；收录前由主会话对关键 URL 做可达性抽验。
- 只允许收录能给出真实原文链接的条目；拿不准的进 Pool，不冒充已核验。
- 地图/面板计数逻辑不变：地图着色仍只统计 `policy` 类已核验条目，其余类别进监测视图，避免污染「直接/相关 OPC 政策」语义。

## 9. 验收标准

1. `npm run collect` 可运行并产出 Pool 与报告；报告含来源可达性。
2. `/monitor` 渲染五类筛选、来源表、待核验池；`/api/intel` 过滤可用。
3. 已核验库覆盖省市增加；无伪造 URL（typecheck 校验 sourceUrl 以 https:// 开头）。
4. 既有地图与面板行为不变；vitest / tsc / eslint / next build 全绿。
5. README 写明监控范围、运行方式与免责声明。
