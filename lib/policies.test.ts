import { describe, expect, it } from "vitest";

import {
  getPolicies,
  getPoliciesForProvince,
  getProvinceSummaries,
  getProvinceSummary,
} from "@/lib/policies";
import { isTraceableSourceUrl } from "@/lib/url-policy";

describe("policy queries", () => {
  it("covers all 31 mainland province-level regions without fabricating local policies", () => {
    const summaries = getProvinceSummaries();

    expect(summaries).toHaveLength(31);
    expect(summaries.map((summary) => summary.name)).toEqual(
      expect.arrayContaining(["北京", "海南", "四川", "新疆", "西藏"]),
    );
    expect(getProvinceSummary("西藏")).toMatchObject({
      policyCount: 0,
      coverageStatus: "none",
    });
  });

  it("reports direct and related coverage from verified local policies", () => {
    const beijing = getProvinceSummary("北京");
    expect(beijing.coverageStatus).toBe("direct");
    expect(beijing.directPolicyCount).toBeGreaterThanOrEqual(3);

    const xinjiang = getProvinceSummary("新疆");
    expect(xinjiang.coverageStatus).toBe("related");
    expect(xinjiang.relatedPolicyCount).toBeGreaterThanOrEqual(1);
  });

  it("keeps national policies separate from local map counts", () => {
    const result = getPoliciesForProvince("西藏");

    expect(result.localPolicies).toEqual([]);
    expect(result.nationalPolicies).toHaveLength(2);
    expect(result.nationalPolicies.every((policy) => policy.province === "全国")).toBe(true);
  });

  it("contains only verified source records and sorts newest first", () => {
    const policies = getPolicies();

    expect(policies.length).toBeGreaterThanOrEqual(20);
    expect(policies.every((policy) => isTraceableSourceUrl(policy.sourceUrl))).toBe(true);
    expect(policies.every((policy) => policy.verifiedAt === "2026-09-03")).toBe(true);
    expect(policies.some((policy) => policy.title.includes("DEMO"))).toBe(false);
    expect(
      policies.every(
        (policy, index) =>
          index === 0 || policies[index - 1].publishDate >= policy.publishDate,
      ),
    ).toBe(true);
  });
});
