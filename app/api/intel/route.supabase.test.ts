import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/intel/route";

const BASE_URL = "https://demo.supabase.co";

function intelRow(over: Record<string, unknown>) {
  return {
    id: "i-test-1",
    kind: "news",
    title: "测试情报 OPC社区",
    province: "上海",
    city: null,
    scope_label: null,
    publish_date: "2026-08-01",
    publish_date_text: null,
    document_number: null,
    issued_by: null,
    source_name: "测试来源",
    source_url: "https://example.com/i",
    source_type: null,
    summary: "测试摘要",
    key_facts: [],
    eligibility: null,
    application_notes: null,
    contact_text: null,
    application_window: null,
    tags: ["测试"],
    discovered_at: "2026-09-03",
    verified: true,
    verified_at: "2026-09-03",
    confidence: "high",
    origin: "manual",
    ...over,
  };
}

describe("GET /api/intel（Supabase 远程路径）", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("按 kind/province 过滤并做 q 关键词后置过滤", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", BASE_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-test");
    const rows = [
      intelRow({ id: "news-a", kind: "news", title: "上海 OPC 社区动态" }),
      intelRow({
        id: "apply-b",
        kind: "application",
        title: "上海 申报通知",
        province: "上海",
      }),
      intelRow({ id: "other-c", province: "浙江" }),
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        const provinceParam = url.searchParams.get("province");
        const kindParam = url.searchParams.get("kind");
        let filtered = rows;
        if (provinceParam) {
          filtered = filtered.filter(
            (r) => r.province === provinceParam.replace("eq.", ""),
          );
        }
        if (kindParam) {
          filtered = filtered.filter(
            (r) => r.kind === kindParam.replace("eq.", ""),
          );
        }
        return new Response(JSON.stringify(filtered), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const response = await GET(
      new Request(
        `http://localhost/api/intel?kind=${encodeURIComponent("news")}&province=${encodeURIComponent("上海")}`,
      ),
    );
    const body = await response.json();

    expect(body.meta.kind).toBe("news");
    expect(body.meta.province).toBe("上海");
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe("news-a");

    const empty = await (
      await GET(new Request(`http://localhost/api/intel?q=${encodeURIComponent("不存在词")}`))
    ).json();
    expect(empty.data).toHaveLength(0);
  });
});
