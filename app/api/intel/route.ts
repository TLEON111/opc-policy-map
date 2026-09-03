import { getIntelFeed, getIntelPoolEntries } from "@/lib/intel";
import { isSupabaseConfigured, supabaseSelect } from "@/lib/supabase";
import {
  intelMatchesKeyword,
  mapIntelRow,
  type IntelRow,
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
  const filters: Record<string, string> = {};
  if (kind) filters.kind = `eq.${kind}`;
  if (province) filters.province = `eq.${province}`;
  const rows = await supabaseSelect<IntelRow>("intel_items", {
    filters,
    order: "publish_date.desc.nullslast",
  });
  const items = rows.map(mapIntelRow);
  const keyword = q?.trim().toLowerCase();
  if (keyword) {
    return items.filter((item) => intelMatchesKeyword(item, keyword));
  }
  return items;
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
