/**
 * Supabase 健康检查（只读）：
 * 检查四张表是否存在、各有多少行（用 anon key 即可）。
 *
 * 用法：
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run check:supabase
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  process.stderr.write("需要 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY\n");
  process.exit(1);
}

const baseUrl = url;
const anonKey = anon;

const TABLES = [
  ["policies", "id"],
  ["intel_items", "id"],
  ["intel_pool", "url"],
  ["changelog", "id"],
] as const;

async function checkTable(table: string): Promise<string> {
  const response = await fetch(
    `${baseUrl}/rest/v1/${table}?select=${table === "intel_pool" ? "url" : "id"}`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Prefer: "count=exact",
        Range: "0-0",
      },
    },
  );
  if (!response.ok) {
    const text = await response.text();
    return `✗ 不可读（HTTP ${response.status}）：${text.slice(0, 120)}`;
  }
  const count = response.headers.get("content-range")?.split("/")[1];
  return `✓ 存在${count !== undefined ? `，约 ${count} 行` : ""}`;
}

for (const [table] of TABLES) {
  process.stdout.write(`${table}: ${await checkTable(table)}\n`);
}
