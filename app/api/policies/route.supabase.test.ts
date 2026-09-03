import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/policies/route";

const BASE_URL = "https://demo.supabase.co";

function policyRow(over: Record<string, unknown>) {
  return {
    id: "p-test-1",
    title: "测试政策",
    province: "广东",
    city: "测试市",
    category: "OPC创业",
    tags: ["测试"],
    publish_date: "2026-06-01",
    effective_date: null,
    expiry_date: null,
    document_number: null,
    issued_by: "测试部门",
    policy_level: "市级",
    relevance: "direct",
    status: "现行有效",
    summary: "测试摘要",
    benefits: ["测试支持"],
    eligibility: ["测试对象"],
    application_notes: "测试办理提示",
    application_url: null,
    source_name: "测试来源",
    source_type: "政策原文",
    source_url: "https://example.com/1",
    verified_at: "2026-09-03",
    ...over,
  };
}

describe("GET /api/policies（Supabase 远程路径）", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("配置 Supabase 时经 PostgREST 读取并保持 本地+全国 顺序", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", BASE_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-test");
    const localRows = [
      policyRow({ id: "gd-a", title: "海珠措施", publish_date: "2026-06-24" }),
      policyRow({ id: "gd-b", title: "省级方案", publish_date: "2026-03-19" }),
    ];
    const nationalRows = [
      policyRow({
        id: "nat-1",
        title: "国家级政策",
        province: "全国",
        publish_date: "2026-06-18",
      }),
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        const provinceParam = url.searchParams.get("province");
        const rows = provinceParam?.includes("全国")
          ? nationalRows
          : provinceParam?.includes("广东")
            ? localRows
            : [];
        return new Response(JSON.stringify(rows), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const response = await GET(
      new Request(`http://localhost/api/policies?province=${encodeURIComponent("广东")}`),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta).toEqual({
      province: "广东",
      total: 3,
      localTotal: 2,
      nationalTotal: 1,
    });
    expect(body.data.map((item: { province: string }) => item.province)).toEqual([
      "广东",
      "广东",
      "全国",
    ]);
  });

  it("Supabase 读取失败时自动回退本地数据", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", BASE_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 })),
    );

    const response = await GET(
      new Request(`http://localhost/api/policies?province=${encodeURIComponent("广东")}`),
    );
    const body = await response.json();

    expect(body.meta.province).toBe("广东");
    expect(body.meta.localTotal).toBe(3); // 本地数据：省级+深圳+海珠
    expect(body.meta.total).toBe(5);
  });
});
