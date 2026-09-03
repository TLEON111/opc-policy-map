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

import { VERIFIED_INTEL } from "../data/verified-intel.ts";
import { VERIFIED_POLICIES } from "../data/verified-policies.ts";

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

  process.stdout.write(
    `Supabase 同步：policies=${policies.length} intel=${intel.length} pool=${pool.length}${DRY_RUN ? "（DRY-RUN）" : ""}\n`,
  );
  if (DRY_RUN) return;

  await upsert("policies", "id", policies);
  await upsert("intel_items", "id", intel);
  if (pool.length > 0) {
    await upsert("intel_pool", "url", pool);
  }
  process.stdout.write("同步完成：policies / intel_items / intel_pool 已 upsert。\n");
}

await run();
