/**
 * Supabase 种子/同步脚本（Node ≥ 22 直接运行）。
 *
 * 作用：把仓库内已核验数据（data/verified-policies.ts、data/verified-intel.ts）
 * 与待核验池（data/pool/pool.json）经 PostgREST upsert 到 Supabase。
 * 前端（Netlify）用 anon key 读；本脚本用 service role key 写。
 *
 * 环境变量：
 *   SUPABASE_URL        形如 https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY service role key（只放 GitHub Secrets / 本地 .env，勿提交）
 * 用法：
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npm run sync:supabase
 *   缺密钥时 --dry-run 可本地核对条数：
 *   npm run sync:supabase -- --dry-run
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { IntelItem } from "../types/intel.ts";
import type { Policy } from "../types/policy.ts";

const VERIFIED_POLICIES = JSON.parse(
  readFileSync(join(process.cwd(), "data", "verified-policies.json"), "utf8"),
) as Policy[];

const VERIFIED_INTEL = JSON.parse(
  readFileSync(join(process.cwd(), "data", "verified-intel.json"), "utf8"),
) as IntelItem[];

const DRY_RUN = process.argv.includes("--dry-run");
const BASE = process.env.SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_KEY;

function loadPool() {
  try {
    const raw = readFileSync(
      join(process.cwd(), "data", "pool", "pool.json"),
      "utf8",
    );
    return (JSON.parse(raw) as { entries?: unknown[] }).entries ?? [];
  } catch {
    return [];
  }
}

/** 读取最近一次巡检报告（用于来源健康度持久化）。 */
function loadLastReportChecks(): {
  checkedAt: string;
  sources: Array<{
    id: string;
    name: string;
    owner: string;
    url: string;
    reachable: boolean;
    httpStatus?: number | null;
    error?: string;
    hitCount?: number;
  }>;
} | null {
  try {
    const raw = readFileSync(
      join(process.cwd(), "data", "pool", "last-report.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as {
      checkedAt?: string;
      sources?: Array<{
        id: string;
        name?: string;
        owner?: string;
        url?: string;
        reachable?: boolean;
        httpStatus?: number | null;
        error?: string;
        hitCount?: number;
      }>;
    };
    if (!parsed.checkedAt || !parsed.sources) return null;
    return {
      checkedAt: parsed.checkedAt,
      sources: parsed.sources.filter((s) => s.id).map((s) => ({
        id: s.id,
        name: s.name ?? s.id,
        owner: s.owner ?? "",
        url: s.url ?? "",
        reachable: Boolean(s.reachable),
        httpStatus: s.httpStatus ?? null,
        error: s.error ?? undefined,
        hitCount: s.hitCount ?? 0,
      })),
    };
  } catch {
    return null;
  }
}

/** 把一次巡检的逐源结果追加进 source_checks（幂等：同一时间戳+来源不重复写）。 */
async function appendSourceChecks(
  report: { checkedAt: string; sources: Array<Record<string, unknown>> },
): Promise<{ total: number; inserted: number }> {
  const total = report.sources.length;
  const existing = await fetch(
    `${BASE}/rest/v1/source_checks?checked_at=eq.${encodeURIComponent(report.checkedAt)}&select=source_id`,
    {
      headers: {
        apikey: KEY ?? "",
        Authorization: `Bearer ${KEY ?? ""}`,
        Prefer: "count=exact",
      },
    },
  );
  let known = new Set<string>();
  if (existing.ok) {
    const rows = (await existing.json()) as Array<{ source_id: string }>;
    known = new Set(rows.map((row) => row.source_id));
  }
  const rows = report.sources
    .filter((source) => !known.has(String(source.id)))
    .map((source) => ({
      checked_at: report.checkedAt,
      source_id: source.id,
      name: source.name,
      owner: source.owner ?? null,
      url: source.url,
      reachable: source.reachable,
      http_status: source.httpStatus ?? null,
      error: source.error ?? null,
      hit_count: source.hitCount ?? 0,
    }));
  if (rows.length === 0) return { total, inserted: 0 };
  const response = await fetch(`${BASE}/rest/v1/source_checks`, {
    method: "POST",
    headers: {
      apikey: KEY ?? "",
      Authorization: `Bearer ${KEY ?? ""}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`source_checks 写入失败（HTTP ${response.status}）：${text.slice(0, 200)}`);
  }
  return { total, inserted: rows.length };
}

async function upsert(table: string, conflict: string, rows: unknown[]): Promise<number> {
  if (rows.length === 0) return 0;
  const response = await fetch(
    `${BASE}/rest/v1/${table}?on_conflict=${conflict}`,
    {
      method: "POST",
      headers: {
        apikey: KEY ?? "",
        Authorization: `Bearer ${KEY ?? ""}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`upsert ${table} 失败（HTTP ${response.status}）：${text.slice(0, 300)}`);
  }
  return rows.length;
}

async function run(): Promise<void> {
  if (!DRY_RUN && (!BASE || !KEY)) {
    process.stderr.write(
      "缺少 SUPABASE_URL / SUPABASE_SERVICE_KEY。可用 --dry-run 仅本地核对条数。\n",
    );
    process.exit(1);
  }

  const policies = VERIFIED_POLICIES.map((p) => ({
    id: p.id,
    title: p.title,
    province: p.province,
    city: p.city,
    category: p.category,
    tags: p.tags,
    publish_date: p.publishDate ?? null,
    effective_date: p.effectiveDate ?? null,
    expiry_date: p.expiryDate ?? null,
    document_number: p.documentNumber ?? null,
    issued_by: p.issuedBy,
    policy_level: p.policyLevel,
    relevance: p.relevance,
    status: p.status,
    summary: p.summary,
    benefits: p.benefits,
    eligibility: p.eligibility,
    application_notes: p.applicationNotes,
    application_url: p.applicationUrl ?? null,
    source_name: p.sourceName,
    source_type: p.sourceType,
    source_url: p.sourceUrl,
    verified_at: p.verifiedAt,
  }));

  const intel = VERIFIED_INTEL.map((item) => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    province: item.province,
    city: item.city ?? null,
    scope_label: item.scopeLabel ?? null,
    publish_date: item.publishDate ?? null,
    publish_date_text: item.publishDateText ?? null,
    document_number: item.documentNumber ?? null,
    issued_by: item.issuedBy ?? null,
    source_name: item.sourceName,
    source_url: item.sourceUrl,
    source_type: item.sourceType ?? null,
    summary: item.summary,
    key_facts: item.keyFacts,
    eligibility: item.eligibility ?? null,
    application_notes: item.applicationNotes ?? null,
    contact_text: item.contactText ?? null,
    application_window: item.applicationWindow ?? null,
    tags: item.tags,
    discovered_at: item.discoveredAt,
    verified: item.verified,
    verified_at: item.verifiedAt ?? null,
    confidence: item.confidence,
    origin: item.origin,
  }));

  const pool = loadPool().map((entry) => {
    const item = entry as {
      url: string;
      title: string;
      snippet?: string | null;
      sourceId: string;
      keyword: string;
      province?: string | null;
      kindGuess?: string | null;
      foundAt: string;
      status: string;
    };
    return {
      url: item.url,
      title: item.title,
      snippet: item.snippet ?? null,
      source_id: item.sourceId,
      keyword: item.keyword,
      province: item.province ?? null,
      kind_guess: item.kindGuess ?? null,
      found_at: item.foundAt,
      status: item.status,
    };
  });

  const lastReport = loadLastReportChecks();

  process.stdout.write(
    `Supabase 同步：policies=${policies.length} intel=${intel.length} pool=${pool.length} source_checks=${lastReport?.sources.length ?? 0}${DRY_RUN ? "（DRY-RUN）" : ""}\n`,
  );
  if (DRY_RUN) return;

  await upsert("policies", "id", policies);
  await upsert("intel_items", "id", intel);
  if (pool.length > 0) {
    await upsert("intel_pool", "url", pool);
  }
  if (lastReport) {
    try {
      const { total, inserted } = await appendSourceChecks(lastReport);
      process.stdout.write(`来源健康度：报告 ${total} 条，本次新增 ${inserted} 条（已存在的跳过）\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stdout.write(`来源健康度：跳过（${message.slice(0, 160)}）——若提示找不到 source_checks 表，请先在 Supabase SQL Editor 运行 supabase/migrations/20260904-source-checks.sql\n`);
    }
  }
  process.stdout.write("同步完成：policies / intel_items / intel_pool / source_checks 已处理。\n");
}

await run();
