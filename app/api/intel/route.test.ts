import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/intel/route";
import { isTraceableSourceUrl } from "@/lib/url-policy";

describe("GET /api/intel", () => {
  it("returns the merged verified intel feed with meta", async () => {
    const response = await GET(new Request("http://localhost/api/intel"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta).toEqual({
      kind: null,
      province: null,
      q: null,
      total: body.data.length,
      poolTotal: expect.any(Number),
    });
    expect(body.data.length).toBeGreaterThanOrEqual(24);
    expect(
      body.data.every((item: { sourceUrl: string }) =>
        isTraceableSourceUrl(item.sourceUrl),
      ),
    ).toBe(true);
  });

  it("filters by kind and rejects unknown kinds", async () => {
    const news = await (
      await GET(new Request("http://localhost/api/intel?kind=news"))
    ).json();
    expect(news.meta.kind).toBe("news");
    expect(news.data.length).toBeGreaterThanOrEqual(2);
    expect(
      news.data.every((item: { kind: string }) => item.kind === "news"),
    ).toBe(true);

    const unknown = await (
      await GET(new Request("http://localhost/api/intel?kind=bogus"))
    ).json();
    expect(unknown.meta.kind).toBeNull();
  });

  it("filters by keyword across titles, summaries and tags", async () => {
    const hit = await (
      await GET(new Request("http://localhost/api/intel?q=OPC社区"))
    ).json();
    expect(hit.meta.q).toBe("OPC社区");
    expect(hit.data.length).toBeGreaterThanOrEqual(3);
    expect(
      hit.data.every(
        (item: { title: string; summary: string; tags: string[]; keyFacts: string[] }) =>
          [item.title, item.summary, item.tags.join(" "), item.keyFacts.join(" ")]
            .join(" ")
            .includes("OPC社区"),
      ),
    ).toBe(true);
  });
});
