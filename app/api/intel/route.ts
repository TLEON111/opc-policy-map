import { getIntelFeed, getIntelPoolEntries, getIntelPoolEntriesForRuntime } from "@/lib/intel";
import { isSupabaseConfigured, supabaseSelect } from "@/lib/supabase";
import {
  intelMatchesKeyword,
  mapIntelRow,
  mapPolicyRowToIntel,
  type IntelRow,
  type PolicyRow,
} from "@/lib/supabase-mappers";
import type { IntelItem, IntelKind } from "@/types/intel";

const VALID_KINDS: readonly IntelKind[] = [
  "policy",
  "application",
  "interpretation",
  "news",
  "resource",
];

async function fetchRemoteIntel(
  kind?: IntelKind,
  province?: string,
  q?: string,
): Promise<IntelItem[]> {
  const wantPolicy = !kind || kind === "policy";
  const wantIntel = !kind || kind !== "policy";

  const results: IntelItem[] = [];

  if (wantPolicy) {
    const policyFilters: Record<string, string> = {};
    if (province) policyFilters.province = `eq.${province}`;
    const policyRows = await supabaseSelect<PolicyRow>("policies", {
      filters: policyFilters,
      order: "publish_date.desc.nullslast",
    });
    results.push(...policyRows.map(mapPolicyRowToIntel));
  }

  if (wantIntel) {
    const intelFilters: Record<string, string> = {};
    if (kind) intelFilters.kind = `eq.${kind}`;
    if (province) intelFilters.province = `eq.${province}`;
    const intelRows = await supabaseSelect<IntelRow>("intel_items", {
      filters: intelFilters,
      order: "publish_date.desc.nullslast",
    });
    results.push(...intelRows.map(mapIntelRow));
  }

  results.sort((a, b) =>
    (b.publishDate ?? "0000-00-00").localeCompare(a.publishDate ?? "0000-00-00"),
  );

  const keyword = q?.trim().toLowerCase();
  if (keyword) {
    return results.filter((item) => intelMatchesKeyword(item, keyword));
  }
  return results;
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const kindParam = searchParams.get("kind");
  const kind =
    kindParam && VALID_KINDS.includes(kindParam as IntelKind)
      ? (kindParam as IntelKind)
      : undefined;
  const province = searchParams.get("province")?.trim() || undefined;
  const q = searchParams.get("q")?.trim() || undefined;

  if (isSupabaseConfigured()) {
    try {
      const items = await fetchRemoteIntel(kind, province, q);
      const poolEntries = await getIntelPoolEntriesForRuntime();
      return Response.json({
        data: items,
        meta: {
          kind: kind ?? null,
          province: province ?? null,
          q: q ?? null,
          total: items.length,
          poolTotal: poolEntries.length,
        },
      });
    } catch (error) {
      console.error("Supabase 读取失败，回退本地数据", error);
    }
  }

  const items = getIntelFeed({ kind, province, q });

  return Response.json({
    data: items,
    meta: {
      kind: kind ?? null,
      province: province ?? null,
      q: q ?? null,
      total: items.length,
      poolTotal: getIntelPoolEntries().length,
    },
  });
}
