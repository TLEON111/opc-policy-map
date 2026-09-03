import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { PolicyDrawer } from "@/components/PolicyDrawer";
import type { Policy, ProvinceSummary } from "@/types/policy";

const summary: ProvinceSummary = {
  name: "广东",
  englishName: "GUANGDONG",
  policyCount: 1,
  directPolicyCount: 1,
  relatedPolicyCount: 0,
  coverageStatus: "direct",
  categoryCounts: { "OPC创业": 1 },
  lastVerifiedAt: "2026-09-03",
};

const directPolicy: Policy = {
  id: "gd-opc",
  title: "广东省支持人工智能OPC创新发展行动方案（2026—2028年）",
  province: "广东",
  city: "广东省",
  category: "OPC创业",
  tags: ["OPC", "算力"],
  publishDate: "2026-03-19",
  documentNumber: "粤发改高技〔2026〕78号",
  issuedBy: "广东省发展改革委",
  policyLevel: "省级",
  relevance: "direct",
  status: "现行有效",
  summary: "支持人工智能 OPC 创新创业发展。",
  benefits: ["算力、数据、模型与创业空间支持"],
  eligibility: ["符合主管部门认定要求的人工智能 OPC"],
  applicationNotes: "具体申报以主管部门后续通知为准。",
  sourceName: "广东省发展改革委（深圳市市场监管局转载）",
  sourceType: "政策原文",
  sourceUrl: "https://amr.sz.gov.cn/example",
  verifiedAt: "2026-09-03",
};

const nationalPolicy: Policy = {
  ...directPolicy,
  id: "national-opc",
  title: "促进平台经济大中小企业协同发展行动方案（2026—2028年）",
  province: "全国",
  city: "全国",
  policyLevel: "国家级",
  relevance: "related",
  documentNumber: undefined,
};

afterEach(() => cleanup());

describe("PolicyDrawer", () => {
  it("shows verified document details and a secure official source link", () => {
    render(
      <PolicyDrawer
        province={summary}
        policies={[directPolicy, nationalPolicy]}
        status="success"
      />,
    );

    expect(screen.getByRole("heading", { name: "广东省" })).toBeInTheDocument();
    expect(screen.getByText("粤发改高技〔2026〕78号")).toBeInTheDocument();
    expect(screen.getAllByText("核验于 2026-09-03")).toHaveLength(2);
    expect(screen.queryByText("DEMO DATA")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /查看官方原文/ })[0]).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });

  it("filters between direct OPC and related support policies", async () => {
    render(
      <PolicyDrawer
        province={summary}
        policies={[directPolicy, nationalPolicy]}
        status="success"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "直接 OPC 1" }));
    expect(screen.getByText(directPolicy.title)).toBeInTheDocument();
    expect(screen.queryByText(nationalPolicy.title)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "相关支撑 1" }));
    expect(screen.queryByText(directPolicy.title)).not.toBeInTheDocument();
    expect(screen.getByText(nationalPolicy.title)).toBeInTheDocument();
  });

  it("explains missing local coverage while retaining national policies", () => {
    render(
      <PolicyDrawer
        province={{ ...summary, name: "四川", policyCount: 0, directPolicyCount: 0, coverageStatus: "none" }}
        policies={[nationalPolicy]}
        status="success"
      />,
    );

    expect(screen.getByText("暂未核验到四川本地 OPC 政策")).toBeInTheDocument();
    expect(screen.getByText(nationalPolicy.title)).toBeInTheDocument();
  });
});
