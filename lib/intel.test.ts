import { afterEach, describe, expect, it, vi } from "vitest";

import { VERIFIED_POLICIES } from "@/data/verified-policies";
import { VERIFIED_INTEL } from "@/data/verified-intel";
import { MONITOR_SOURCES } from "@/data/monitor-sources";
import {
  getChangelog,
  getIntelFeed,
  getIntelPoolEntries,
  getMonitorOverviewForRuntime,
  getMonitorOverview,
  getProvinceCoverageMatrix,
  getVerifiedIntel,
} from "@/lib/intel";
import { isTraceableSourceUrl } from "@/lib/url-policy";

describe("intel feed", () => {
  it("merges projected policies and verified intel without duplicate ids", () => {
    const feed = getVerifiedIntel();
    const ids = new Set(feed.map((item) => item.id));

    expect(feed).toHaveLength(VERIFIED_POLICIES.length + VERIFIED_INTEL.length);
    expect(ids.size).toBe(feed.length);
    expect(feed.some((item) => item.kind === "news")).toBe(true);
    expect(feed.some((item) => item.kind === "resource")).toBe(true);
  });

  it("keeps every verified item traceable to a real https source", () => {
    const feed = getVerifiedIntel();

    expect(feed.every((item) => isTraceableSourceUrl(item.sourceUrl))).toBe(true);
    expect(feed.every((item) => item.verified === true)).toBe(true);
    expect(
      feed.every((item) => ["2026-09-03", "2026-09-04"].includes(item.verifiedAt ?? "")),
    ).toBe(true);
    expect(feed.every((item) => item.confidence === "high")).toBe(true);
  });

  it("sorts newest first with publishDate fallback at the end", () => {
    const feed = getVerifiedIntel();

    for (let index = 1; index < feed.length; index += 1) {
      const prev = feed[index - 1].publishDate ?? "0000-00-00";
      const current = feed[index].publishDate ?? "0000-00-00";
      expect(prev >= current).toBe(true);
    }
  });

  it("filters by kind without leaking other categories", () => {
    const news = getIntelFeed({ kind: "news" });

    expect(news.length).toBeGreaterThanOrEqual(2);
    expect(news.every((item) => item.kind === "news")).toBe(true);
  });

  it("filters by province and keeps national policies queryable", () => {
    const shanghai = getIntelFeed({ province: "上海" });
    expect(shanghai.some((item) => item.id.includes("sh-opc-community-forum"))).toBe(true);

    const national = getIntelFeed({ province: "全国" });
    expect(national.every((item) => item.province === "全国")).toBe(true);
    expect(national.length).toBeGreaterThanOrEqual(2);
  });

  it("filters by keyword across titles and key facts", () => {
    const keyword = getIntelFeed({ q: "武汉" });

    expect(keyword.length).toBeGreaterThanOrEqual(3);
    expect(
      keyword.every((item) =>
        [item.title, item.summary, item.tags.join(" ")]
          .join(" ")
          .includes("武汉"),
      ),
    ).toBe(true);
  });
});

describe("province coverage matrix", () => {
  it("covers exactly the 31 mainland province-level regions", () => {
    const rows = getProvinceCoverageMatrix();

    expect(rows).toHaveLength(31);
    expect(rows.map((row) => row.name)).toEqual(
      expect.arrayContaining(["北京", "广东", "西藏", "宁夏", "黑龙江"]),
    );
  });

  it("classifies tiers and keeps counts consistent", () => {
    const rows = getProvinceCoverageMatrix();

    expect(rows.filter((row) => row.coverage !== "none").length).toBeGreaterThanOrEqual(28);
    expect(rows.filter((row) => row.coverage === "direct").length).toBeGreaterThanOrEqual(15);
    expect(
      rows.every(
        (row) =>
          row.policyTotal === row.policyDirect + row.policyRelated &&
          (row.coverage !== "none" || (row.policyTotal === 0 && row.intelTotal === 0)),
      ),
    ).toBe(true);
    const noneNames = rows
      .filter((row) => row.coverage === "none")
      .map((row) => row.name)
      .sort();
    expect(noneNames).toEqual(["宁夏", "西藏"]);
  });
});

describe("pool and overview", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reads pool entries produced by the collector", () => {
    const entries = getIntelPoolEntries();

    expect(Array.isArray(entries)).toBe(true);
    for (const entry of entries) {
      expect(entry.url).toMatch(/^https?:\/\//);
      expect(entry.status).toBe("pending");
      expect(entry.sourceId).toBeTruthy();
    }
  });

  it("aggregates monitor overview from registry, feed and pool", () => {
    const overview = getMonitorOverview();

    expect(overview.sources).toHaveLength(MONITOR_SOURCES.length);
    expect(overview.sourceStats.total).toBe(MONITOR_SOURCES.length);
    expect(overview.verifiedStats.total).toBe(
      VERIFIED_POLICIES.length + VERIFIED_INTEL.length,
    );
    expect(overview.verifiedStats.byKind.policy).toBe(VERIFIED_POLICIES.length);
    expect(overview.verifiedStats.byKind.news).toBeGreaterThanOrEqual(2);
    expect(overview.pool.total).toBe(getIntelPoolEntries().length);
    expect(overview.sourceHealthMode).toBe("collect-report");
    expect(overview.recent.length).toBeGreaterThan(0);
    expect(overview.sourceStats.pending).toBeGreaterThanOrEqual(0);
    expect(overview.sourceHealth).toHaveLength(MONITOR_SOURCES.length);
    expect(
      overview.sourceStats.enabled + overview.sourceHealth.filter((row) => !row.enabled).length,
    ).toBe(MONITOR_SOURCES.length);
  });

  it("builds runtime overview from Supabase intel_pool when remote env is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            {
              url: "https://example.com/remote-pool-a",
              title: "远程池线索 A",
              snippet: null,
              source_id: "cq-scjgj",
              keyword: "OPC",
              province: "重庆",
              kind_guess: null,
              found_at: "2026-09-04T01:00:00.000Z",
              status: "pending",
            },
            {
              url: "https://example.com/remote-pool-b",
              title: "远程池线索 B",
              snippet: null,
              source_id: "cq-scjgj",
              keyword: "超级个体",
              province: "重庆",
              kind_guess: "news",
              found_at: "2026-09-04T02:00:00.000Z",
              status: "pending",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const overview = await getMonitorOverviewForRuntime();

    expect(overview.pool).toEqual({
      total: 2,
      updatedAt: "2026-09-04T02:00:00.000Z",
    });
    expect(overview.sourceHealthMode).toBe("pool-snapshot");
    expect(overview.sourceReportCheckedAt).toBe("2026-09-04T02:00:00.000Z");
    expect(overview.sourceHealth.find((row) => row.id === "cq-scjgj")).toMatchObject({
      state: "reachable",
      hitCount: 2,
      lastCheckedAt: "2026-09-04T02:00:00.000Z",
    });
  });

  it("exposes a dated changelog sorted newest first", () => {
    const changelog = getChangelog();

    expect(changelog.length).toBeGreaterThanOrEqual(1);
    expect(
      changelog.every(
        (entry) =>
          ["2026-09-03", "2026-09-04"].includes(entry.date) && entry.summary.length > 0,
      ),
    ).toBe(true);
  });
});
