import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CHANGELOG, type ChangeEntry } from "@/data/changelog";
import { MONITOR_SOURCES } from "@/data/monitor-sources";
import { VERIFIED_INTEL } from "@/data/verified-intel";
import { VERIFIED_POLICIES } from "@/data/verified-policies";
import { PROVINCE_NAMES } from "@/lib/policies";
import { isSupabaseConfigured, supabaseSelect } from "@/lib/supabase";
import { mapIntelPoolRow, type IntelPoolRow } from "@/lib/supabase-mappers";
import type { Policy } from "@/types/policy";
import {
  INTEL_KIND_LABELS,
  type IntelItem,
  type IntelKind,
  type IntelPoolEntry,
  type IntelSource,
} from "@/types/intel";

/**
 * 情报收纳/查询层（仅服务端使用：路由处理器 / 服务端组件 / 测试）。
 * 统一情报流 = data/verified-policies.ts 的政策文件投影(kind=policy)
 *            + data/verified-intel.ts 的四类跟进情报
 *            + data/pool/pool.json 的待核验池（巡检器写入）。
 */

/** 把已核验政策投影为情报条目（policy 类），避免双重记账。 */
function projectPolicyToIntel(policy: Policy): IntelItem {
  return {
    id: `policy:${policy.id}`,
    kind: "policy",
    title: policy.title,
    province: policy.province,
    city: policy.city,
    publishDate: policy.publishDate,
    documentNumber: policy.documentNumber,
    issuedBy: policy.issuedBy,
    sourceName: policy.sourceName,
    sourceType: policy.sourceType,
    sourceUrl: policy.sourceUrl,
    summary: policy.summary,
    keyFacts: [...policy.benefits],
    eligibility: [...policy.eligibility],
    applicationNotes: policy.applicationNotes,
    tags: [...policy.tags],
    discoveredAt: policy.verifiedAt,
    verified: true,
    verifiedAt: policy.verifiedAt,
    confidence: "high",
    origin: "manual",
  };
}

function sortNewestFirst(items: IntelItem[]): IntelItem[] {
  return [...items].sort(
    (a, b) =>
      (b.publishDate ?? "0000-00-00").localeCompare(a.publishDate ?? "0000-00-00"),
  );
}

export function getVerifiedIntel(): IntelItem[] {
  return sortNewestFirst([
    ...VERIFIED_POLICIES.map(projectPolicyToIntel),
    ...VERIFIED_INTEL,
  ]);
}

export interface IntelFeedFilters {
  kind?: IntelKind;
  province?: string;
  /** 关键词：对标题/摘要/标签/发文机关/文号做不区分大小写包含匹配。 */
  q?: string;
}

/** 统一情报流（已核验），可按类别/省份/关键词过滤。 */
export function getIntelFeed(filters: IntelFeedFilters = {}): IntelItem[] {
  const { kind, province, q } = filters;
  const keyword = q?.trim().toLowerCase();
  return getVerifiedIntel().filter((item) => {
    if (kind && item.kind !== kind) return false;
    if (province && item.province !== province) return false;
    if (keyword) {
      const haystack = [
        item.title,
        item.summary,
        item.issuedBy,
        item.documentNumber,
        item.tags.join(" "),
        item.keyFacts.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });
}

/** 省级覆盖矩阵行：把 31 省在「直接政策/相关政策/情报动态/待跟踪」上的覆盖与计数算出来。 */
export interface ProvinceCoverageRow {
  name: string;
  policyDirect: number;
  policyRelated: number;
  policyTotal: number;
  intelTotal: number;
  coverage: "direct" | "policy" | "intel" | "none";
}

export function getProvinceCoverageMatrix(): ProvinceCoverageRow[] {
  const rows: ProvinceCoverageRow[] = Object.keys(PROVINCE_NAMES).map((name) => ({
    name,
    policyDirect: 0,
    policyRelated: 0,
    policyTotal: 0,
    intelTotal: 0,
    coverage: "none",
  }));
  const byName = new Map(rows.map((row) => [row.name, row]));

  for (const policy of VERIFIED_POLICIES) {
    if (policy.province === "全国") continue;
    const row = byName.get(policy.province);
    if (!row) continue;
    if (policy.relevance === "direct") row.policyDirect += 1;
    else row.policyRelated += 1;
    row.policyTotal += 1;
  }
  for (const item of VERIFIED_INTEL) {
    if (item.province === "全国") continue;
    const row = byName.get(item.province);
    if (!row) continue;
    row.intelTotal += 1;
  }

  for (const row of rows) {
    row.coverage =
      row.policyTotal > 0
        ? row.policyDirect > 0
          ? "direct"
          : "policy"
        : row.intelTotal > 0
          ? "intel"
          : "none";
  }
  return rows;
}

const POOL_PATH = join(process.cwd(), "data", "pool", "pool.json");
const LAST_REPORT_PATH = join(process.cwd(), "data", "pool", "last-report.json");

function latestFoundAt(entries: IntelPoolEntry[]): string | null {
  return entries.reduce<string | null>((latest, entry) => {
    if (!latest || entry.foundAt > latest) return entry.foundAt;
    return latest;
  }, null);
}

/** 读取待核验池（巡检器产出）；文件不存在/损坏时返回空池。 */
export function getIntelPoolEntries(): IntelPoolEntry[] {
  try {
    const raw = readFileSync(POOL_PATH, "utf8");
    const parsed = JSON.parse(raw) as { entries?: IntelPoolEntry[] };
    return parsed.entries ?? [];
  } catch {
    return [];
  }
}

export function getPoolUpdatedAt(): string | null {
  try {
    const raw = readFileSync(POOL_PATH, "utf8");
    const parsed = JSON.parse(raw) as { updatedAt?: string };
    return parsed.updatedAt ?? null;
  } catch {
    return null;
  }
}

async function fetchRemoteIntelPoolEntries(): Promise<IntelPoolEntry[]> {
  const rows = await supabaseSelect<IntelPoolRow>("intel_pool", {
    order: "found_at.desc",
  });
  return rows.map(mapIntelPoolRow);
}

/** 运行时读取待核验池：生产优先 Supabase，失败回退本地文件。 */
export async function getIntelPoolEntriesForRuntime(): Promise<IntelPoolEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      return await fetchRemoteIntelPoolEntries();
    } catch (error) {
      console.error("Supabase intel_pool 读取失败，回退本地待核验池", error);
    }
  }
  return getIntelPoolEntries();
}

interface LastReportSource {
  id: string;
  reachable: boolean;
  hitCount?: number;
  httpStatus?: number | null;
  error?: string;
}

/** 读取最近一次巡检报告（采集器写入）；无记录返回 null。 */
export function getLastCollectReport(): {
  checkedAt: string;
  sources: LastReportSource[];
} | null {
  try {
    const raw = readFileSync(LAST_REPORT_PATH, "utf8");
    const parsed = JSON.parse(raw) as {
      checkedAt?: string;
      sources?: LastReportSource[];
    };
    if (!parsed.sources) return null;
    return { checkedAt: parsed.checkedAt ?? "", sources: parsed.sources };
  } catch {
    return null;
  }
}

/** 来源健康行：合并注册表与最近一次巡检结果，供监测页展示。 */
export interface SourceHealthRow {
  id: string;
  name: string;
  owner: string;
  url: string;
  level: IntelSource["level"];
  note?: string;
  enabled: boolean;
  state: "reachable" | "failed" | "pending" | "quiet";
  hitCount?: number;
  lastCheckedAt?: string;
}

export function getIntelSources(): IntelSource[] {
  return MONITOR_SOURCES;
}

/** 收录/功能更新日志（新→旧）。 */
export function getChangelog(): ChangeEntry[] {
  return [...CHANGELOG].sort((a, b) => b.date.localeCompare(a.date));
}

export interface MonitorOverview {
  updatedAt: string;
  sources: IntelSource[];
  sourceStats: {
    total: number;
    enabled: number;
    reachable: number;
    pending: number;
  };
  sourceHealth: SourceHealthRow[];
  sourceReportCheckedAt: string | null;
  verifiedStats: {
    total: number;
    byKind: Record<IntelKind, number>;
    provincesCovered: string[];
  };
  pool: {
    total: number;
    updatedAt: string | null;
  };
  recent: IntelItem[];
}

const EMPTY_KIND_COUNTS: Record<IntelKind, number> = {
  policy: 0,
  application: 0,
  interpretation: 0,
  news: 0,
  resource: 0,
};

function buildMonitorOverview({
  recentCount,
  poolEntries,
  poolUpdatedAt,
  lastReport,
  healthMode,
}: {
  recentCount: number;
  poolEntries: IntelPoolEntry[];
  poolUpdatedAt: string | null;
  lastReport: ReturnType<typeof getLastCollectReport>;
  healthMode: "collect-report" | "pool-snapshot";
}): MonitorOverview {
  const feed = getVerifiedIntel();
  const byKind: Record<IntelKind, number> = { ...EMPTY_KIND_COUNTS };
  for (const item of feed) byKind[item.kind] += 1;

  const provinces = new Set(
    feed.filter((item) => item.province !== "全国").map((item) => item.province),
  );

  const sources = getIntelSources();
  const enabled = sources.filter((source) => source.enabled);
  const liveById = new Map(
    (lastReport?.sources ?? []).map((item) => [item.id, item]),
  );
  const poolHitCountBySource = new Map<string, number>();
  for (const entry of poolEntries) {
    poolHitCountBySource.set(
      entry.sourceId,
      (poolHitCountBySource.get(entry.sourceId) ?? 0) + 1,
    );
  }
  const sourceHealth: SourceHealthRow[] = sources.map((source) => {
    const live = liveById.get(source.id);
    const poolHitCount = poolHitCountBySource.get(source.id) ?? 0;
    const state: SourceHealthRow["state"] =
      healthMode === "pool-snapshot"
        ? !source.enabled
          ? "pending"
          : poolHitCount > 0
            ? "reachable"
            : "quiet"
        : !source.enabled
          ? "pending"
          : live
            ? live.reachable
              ? "reachable"
              : "failed"
            : source.reachable
              ? "reachable"
              : "failed";
    return {
      id: source.id,
      name: source.name,
      owner: source.owner,
      url: source.url,
      level: source.level,
      note: source.note,
      enabled: source.enabled,
      state,
      hitCount: healthMode === "pool-snapshot" ? poolHitCount : live?.hitCount ?? 0,
      lastCheckedAt:
        healthMode === "pool-snapshot"
          ? poolUpdatedAt ?? undefined
          : live
            ? lastReport?.checkedAt
            : undefined,
    };
  });
  const reachable = sourceHealth.filter(
    (row) => row.enabled && row.state === "reachable",
  ).length;

  return {
    updatedAt: "2026-09-03",
    sources,
    sourceStats: {
      total: sources.length,
      enabled: enabled.length,
      reachable,
      pending: enabled.length - reachable,
    },
    sourceHealth,
    sourceReportCheckedAt: lastReport?.checkedAt ?? poolUpdatedAt,
    verifiedStats: {
      total: feed.length,
      byKind,
      provincesCovered: [...provinces].sort(),
    },
    pool: {
      total: poolEntries.length,
      updatedAt: poolUpdatedAt,
    },
    recent: feed.slice(0, recentCount),
  };
}

/** 监测页/概览所需的一次性本地聚合。 */
export function getMonitorOverview(recentCount = 6): MonitorOverview {
  return buildMonitorOverview({
    recentCount,
    poolEntries: getIntelPoolEntries(),
    poolUpdatedAt: getPoolUpdatedAt(),
    lastReport: getLastCollectReport(),
    healthMode: "collect-report",
  });
}

/** 运行时概览：生产优先用 Supabase intel_pool 填充待核验池与来源命中状态。 */
export async function getMonitorOverviewForRuntime(
  recentCount = 6,
): Promise<MonitorOverview> {
  const { overview } = await getMonitorRuntimeData(recentCount);
  return overview;
}

export async function getMonitorRuntimeData(
  recentCount = 6,
): Promise<{ overview: MonitorOverview; poolEntries: IntelPoolEntry[] }> {
  if (isSupabaseConfigured()) {
    try {
      const poolEntries = await fetchRemoteIntelPoolEntries();
      const poolUpdatedAt = latestFoundAt(poolEntries);
      return {
        overview: buildMonitorOverview({
          recentCount,
          poolEntries,
          poolUpdatedAt,
          lastReport: null,
          healthMode: "pool-snapshot",
        }),
        poolEntries,
      };
    } catch (error) {
      console.error("Supabase intel_pool 读取失败，回退本地监控概览", error);
    }
  }
  return {
    overview: getMonitorOverview(recentCount),
    poolEntries: getIntelPoolEntries(),
  };
}

export { INTEL_KIND_LABELS };
