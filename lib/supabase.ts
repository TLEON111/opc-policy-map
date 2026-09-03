/**
 * Supabase 读取层（服务端 API 路由使用）。
 *
 * 规则：
 *  - 配置了 NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY 时走 PostgREST（Netlify 生产）；
 *  - 未配置时 API 自动回退到本地数据（开发/测试），保证功能等价与测试可离线跑。
 *
 * 注意：此层只读。写库（seed/每日同步）在 scripts/sync-supabase.ts，用 service key。
 */

function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
}

function supabaseAnon(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnon());
}

export interface SupabaseQuery {
  select?: string;
  order?: string;
  limit?: string;
  // PostgREST 过滤器（如 province=eq.广东）
  filters?: Record<string, string>;
}

/** 经 PostgREST 读取一行或多行（仅 anon 可读表）。 */
export async function supabaseSelect<T>(
  table: string,
  query: SupabaseQuery = {},
): Promise<T[]> {
  const url = supabaseUrl();
  const anon = supabaseAnon();
  if (!url || !anon) {
    throw new Error("supabaseSelect 需要 NEXT_PUBLIC_SUPABASE_URL/ANON_KEY");
  }
  const params = new URLSearchParams();
  if (query.select) params.set("select", query.select);
  if (query.order) params.set("order", query.order);
  if (query.limit) params.set("limit", query.limit);
  for (const [key, value] of Object.entries(query.filters ?? {})) {
    params.set(key, value);
  }
  const response = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Supabase ${table} 读取失败（HTTP ${response.status}）：${text.slice(0, 200)}`,
    );
  }
  return (await response.json()) as T[];
}
