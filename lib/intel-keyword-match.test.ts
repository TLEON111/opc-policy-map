import { describe, expect, it } from "vitest";

import { getIntelKeywordHits } from "@/lib/intel-keyword-match";

describe("getIntelKeywordHits", () => {
  it("matches explicit OPC policy wording", () => {
    expect(getIntelKeywordHits("深圳发布人工智能OPC创业生态行动计划")).toContain(
      "人工智能OPC",
    );
  });

  it("does not match broad super-individual wording without an AI or startup context", () => {
    expect(getIntelKeywordHits("城市合伙人与超级个体访谈活动")).toEqual([]);
  });

  it("matches super-individual wording when it appears with AI startup context", () => {
    expect(getIntelKeywordHits("AI超级个体创业社区发布")).toEqual([
      "超级个体+AI/创业/社区",
    ]);
  });
});
