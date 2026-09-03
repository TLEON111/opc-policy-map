import { getIntelFeed, getIntelPoolEntries } from "@/lib/intel";
import type { IntelKind } from "@/types/intel";

const VALID_KINDS: readonly IntelKind[] = [
  "policy",
  "application",
  "interpretation",
  "news",
  "resource",
];

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const kindParam = searchParams.get("kind");
  const kind =
    kindParam && VALID_KINDS.includes(kindParam as IntelKind)
      ? (kindParam as IntelKind)
      : undefined;
  const province = searchParams.get("province")?.trim() || undefined;
  const q = searchParams.get("q")?.trim() || undefined;
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
