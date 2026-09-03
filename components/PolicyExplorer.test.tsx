import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PolicyExplorer } from "@/components/PolicyExplorer";
import type { Policy, ProvinceSummary } from "@/types/policy";

vi.mock("@/components/ChinaMap", () => ({
  ChinaMap: ({ onProvinceSelect }: { onProvinceSelect: (name: string) => void }) => (
    <button type="button" onClick={() => onProvinceSelect("四川省")}>选择四川</button>
  ),
}));

const summaries: ProvinceSummary[] = [
  {
    name: "北京",
    englishName: "BEIJING",
    policyCount: 1,
    directPolicyCount: 1,
    relatedPolicyCount: 0,
    coverageStatus: "direct",
    categoryCounts: { "OPC创业": 1 },
    lastVerifiedAt: "2026-09-03",
  },
  {
    name: "四川",
    englishName: "SICHUAN",
    policyCount: 0,
    directPolicyCount: 0,
    relatedPolicyCount: 0,
    coverageStatus: "none",
    categoryCounts: {},
    lastVerifiedAt: "2026-09-03",
  },
];

function makePolicy(province: string, title: string): Policy {
  return {
    id: `${province}-${title}`,
    title,
    province,
    city: province,
    category: "OPC创业",
    tags: ["OPC"],
    publishDate: "2026-09-01",
    issuedBy: "政府部门",
    policyLevel: province === "全国" ? "国家级" : "省级",
    relevance: "direct",
    status: "现行有效",
    summary: "政策摘要。",
    benefits: ["政策支持"],
    eligibility: ["符合条件的OPC"],
    applicationNotes: "以主管部门通知为准。",
    sourceName: "政府网站",
    sourceType: "政策原文",
    sourceUrl: "https://www.gov.cn/zhengce/",
    verifiedAt: "2026-09-03",
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PolicyExplorer", () => {
  it("loads Beijing initially and updates the panel when a province is selected", async () => {
    const beijing = makePolicy("北京", "北京OPC政策");
    const national = makePolicy("全国", "全国OPC政策");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const isSichuan = String(input).includes(encodeURIComponent("四川"));
      const data = isSichuan ? [national] : [beijing, national];
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data,
            meta: {
              province: isSichuan ? "四川" : "北京",
              total: data.length,
              localTotal: isSichuan ? 0 : 1,
              nationalTotal: 1,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    });

    render(<PolicyExplorer summaries={summaries} />);

    expect(await screen.findByText("北京OPC政策")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "选择四川" }));
    expect(await screen.findByText("暂未核验到四川本地 OPC 政策")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "四川省" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/policies?province=${encodeURIComponent("四川")}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
