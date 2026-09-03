/**
 * 生成 supabase/bootstrap.sql —— 一条 SQL 完成「建表 + 灌入当前全部已核验数据」。
 *
 * 适用：Supabase Dashboard → SQL Editor → 粘贴运行（无需 service key / 脚本环境）。
 * 运行：npm run gen:bootstrap （生成 supabase/bootstrap.sql；数据变更后重跑并提交）
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { VERIFIED_INTEL } from "../data/verified-intel.ts";
import { VERIFIED_POLICIES } from "../data/verified-policies.ts";

function escString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlValue(value: unknown): string {
  if (value === undefined || value === null) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return escString(value);
  if (Array.isArray(value)) {
    const items = value.map((item) => {
      if (item === null || item === undefined) return "NULL";
      const str = String(item).replace(/(["\\])/g, "\\$1");
      return `"${str}"`;
    });
    return `ARRAY[${items.join(",")}]::text[]`;
  }
  if (typeof value === "object") {
    return `${escString(JSON.stringify(value))}::jsonb`;
  }
  return "NULL";
}

function insertRows(
  table: string,
  columns: string[],
  rows: unknown[][],
  conflict = "id",
): string {
  const lines = rows.map(
    (row) => `  (${row.map(sqlValue).join(", ")})`,
  );
  return `insert into public.${table} (${columns.join(", ")})
values
${lines.join(",\n")}
on conflict (${conflict}) do nothing;
`;
}

const policyColumns = [
  "id", "title", "province", "city", "category", "tags", "publish_date",
  "effective_date", "expiry_date", "document_number", "issued_by",
  "policy_level", "relevance", "status", "summary", "benefits", "eligibility",
  "application_notes", "application_url", "source_name", "source_type",
  "source_url", "verified_at",
] as const;

const policyRows = VERIFIED_POLICIES.map((p) => [
  p.id, p.title, p.province, p.city, p.category, p.tags,
  p.publishDate, p.effectiveDate ?? null, p.expiryDate ?? null,
  p.documentNumber ?? null, p.issuedBy, p.policyLevel, p.relevance, p.status,
  p.summary, p.benefits, p.eligibility, p.applicationNotes,
  p.applicationUrl ?? null, p.sourceName, p.sourceType, p.sourceUrl, p.verifiedAt,
]);

const intelColumns = [
  "id", "kind", "title", "province", "city", "scope_label", "publish_date",
  "publish_date_text", "document_number", "issued_by", "source_name",
  "source_url", "source_type", "summary", "key_facts", "eligibility",
  "application_notes", "contact_text", "application_window", "tags",
  "discovered_at", "verified", "verified_at", "confidence", "origin",
] as const;

const intelRows = VERIFIED_INTEL.map((i) => [
  i.id, i.kind, i.title, i.province, i.city ?? null, i.scopeLabel ?? null,
  i.publishDate ?? null, i.publishDateText ?? null, i.documentNumber ?? null,
  i.issuedBy ?? null, i.sourceName, i.sourceUrl, i.sourceType ?? null,
  i.summary, i.keyFacts, i.eligibility ?? null, i.applicationNotes ?? null,
  i.contactText ?? null, i.applicationWindow ?? null, i.tags, i.discoveredAt,
  i.verified, i.verifiedAt ?? null, i.confidence, i.origin,
]);

let poolEntries: unknown[][] = [];
try {
  const raw = readFileSync(
    join(process.cwd(), "data", "pool", "pool.json"),
    "utf8",
  );
  const pool = (JSON.parse(raw) as { entries?: Array<Record<string, unknown>> }).entries ?? [];
  poolEntries = pool.map((e) => [
    e.url, e.title, e.snippet ?? null, e.sourceId, e.keyword,
    e.province ?? null, e.kindGuess ?? null, e.foundAt, e.status,
  ]);
} catch {
  poolEntries = [];
}

const poolColumns = [
  "url", "title", "snippet", "source_id", "keyword", "province",
  "kind_guess", "found_at", "status",
] as const;

const schema = readFileSync(
  join(process.cwd(), "supabase", "schema.sql"),
  "utf8",
);

const parts: string[] = [
  "-- 由 scripts/gen-bootstrap.ts 生成（npm run gen:bootstrap）——请勿手改",
  "-- 用法：Supabase → SQL Editor 粘贴运行（幂等：on conflict do nothing）",
  "-- 数据版本：policies 37 · intel 27 · pool entries 见文末",
  schema,
  "",
  insertRows("policies", [...policyColumns], policyRows),
  insertRows("intel_items", [...intelColumns], intelRows),
];

if (poolEntries.length > 0) {
  parts.push(insertRows("intel_pool", [...poolColumns], poolEntries, "url"));
}

writeFileSync(
  join(process.cwd(), "supabase", "bootstrap.sql"),
  parts.join("\n"),
  "utf8",
);
process.stdout.write(
  `已生成 supabase/bootstrap.sql（policies=${policyRows.length} intel=${intelRows.length} pool=${poolEntries.length}）\n`,
);
