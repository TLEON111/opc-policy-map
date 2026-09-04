import { describe, expect, it } from "vitest";

import { formatProvinceTooltip, getMapFill } from "@/components/ChinaMap";
import type { ProvinceSummary } from "@/types/policy";

describe("ChinaMap helpers", () => {
  it("maps verified coverage status to three visual levels", () => {
    expect(getMapFill("none")).toBe("#e8eef6");
    expect(getMapFill("related")).toBe("#9fc4f3");
    expect(getMapFill("direct")).toBe("#247be5");
  });

  it("formats a useful province tooltip from policy statistics", () => {
    const summary: ProvinceSummary = {
      name: "重庆",
      englishName: "CHONGQING",
      policyCount: 3,
      directPolicyCount: 2,
      relatedPolicyCount: 1,
      coverageStatus: "direct",
      categoryCounts: { "OPC创业": 2, "创业服务": 1 },
      lastVerifiedAt: "2026-09-03",
    };

    expect(formatProvinceTooltip("重庆", summary)).toContain("重庆");
    expect(formatProvinceTooltip("重庆", summary)).toContain("直接OPC政策：2");
    expect(formatProvinceTooltip("重庆", summary)).toContain("相关支撑政策：1");
    expect(formatProvinceTooltip("重庆", summary)).toContain("点击查看");
  });
});
