import type { Policy } from "@/types/policy";
import type { IntelItem } from "@/types/intel";

/** PostgREST 返回的 policies 行（snake_case）→ Policy。 */
export interface PolicyRow {
  id: string;
  title: string;
  province: string;
  city: string;
  category: Policy["category"];
  tags: string[];
  publish_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  document_number: string | null;
  issued_by: string;
  policy_level: Policy["policyLevel"];
  relevance: Policy["relevance"];
  status: Policy["status"];
  summary: string;
  benefits: string[];
  eligibility: string[];
  application_notes: string;
  application_url: string | null;
  source_name: string;
  source_type: Policy["sourceType"];
  source_url: string;
  verified_at: string;
}

export function mapPolicyRow(row: PolicyRow): Policy {
  return {
    id: row.id,
    title: row.title,
    province: row.province,
    city: row.city,
    category: row.category,
    tags: row.tags ?? [],
    publishDate: row.publish_date ?? "1970-01-01",
    effectiveDate: row.effective_date ?? undefined,
    expiryDate: row.expiry_date ?? undefined,
    documentNumber: row.document_number ?? undefined,
    issuedBy: row.issued_by,
    policyLevel: row.policy_level,
    relevance: row.relevance,
    status: row.status,
    summary: row.summary,
    benefits: row.benefits ?? [],
    eligibility: row.eligibility ?? [],
    applicationNotes: row.application_notes,
    applicationUrl: row.application_url ?? undefined,
    sourceName: row.source_name,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    verifiedAt: row.verified_at,
  };
}

/** PostgREST 返回的 intel_items 行 → IntelItem。 */
export interface IntelRow {
  id: string;
  kind: IntelItem["kind"];
  title: string;
  province: string;
  city: string | null;
  scope_label: string | null;
  publish_date: string | null;
  publish_date_text: string | null;
  document_number: string | null;
  issued_by: string | null;
  source_name: string;
  source_url: string;
  source_type: string | null;
  summary: string;
  key_facts: string[];
  eligibility: string[] | null;
  application_notes: string | null;
  contact_text: string | null;
  application_window: { start?: string; end?: string; text?: string } | null;
  tags: string[];
  discovered_at: string;
  verified: boolean;
  verified_at: string | null;
  confidence: IntelItem["confidence"];
  origin: IntelItem["origin"];
}

export function mapIntelRow(row: IntelRow): IntelItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    province: row.province,
    city: row.city ?? undefined,
    scopeLabel: row.scope_label ?? undefined,
    publishDate: row.publish_date ?? undefined,
    publishDateText: row.publish_date_text ?? undefined,
    documentNumber: row.document_number ?? undefined,
    issuedBy: row.issued_by ?? undefined,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourceType: row.source_type ?? undefined,
    summary: row.summary,
    keyFacts: row.key_facts ?? [],
    eligibility: row.eligibility ?? undefined,
    applicationNotes: row.application_notes ?? undefined,
    contactText: row.contact_text ?? undefined,
    applicationWindow: row.application_window ?? undefined,
    tags: row.tags ?? [],
    discoveredAt: row.discovered_at,
    verified: row.verified,
    verifiedAt: row.verified_at ?? undefined,
    confidence: row.confidence,
    origin: row.origin,
  };
}

/** 与 lib/intel.ts 一致的关键词匹配（供 q 过滤在远端结果上复用）。 */
export function intelMatchesKeyword(item: IntelItem, keyword: string): boolean {
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
  return haystack.includes(keyword);
}
