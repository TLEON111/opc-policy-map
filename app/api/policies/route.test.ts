import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/policies/route";

describe("GET /api/policies", () => {
  it("returns local and nationally applicable policies for a province", async () => {
    const response = await GET(
      new Request("http://localhost/api/policies?province=广东"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta).toEqual({
      province: "广东",
      total: 5,
      localTotal: 3,
      nationalTotal: 2,
    });
    expect(body.data.map((policy: { province: string }) => policy.province)).toEqual([
      "广东",
      "广东",
      "广东",
      "全国",
      "全国",
    ]);
  });

  it("returns national baseline policies for a region with no verified local policy", async () => {
    const response = await GET(
      new Request("http://localhost/api/policies?province=西藏"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta).toEqual({
      province: "西藏",
      total: 2,
      localTotal: 0,
      nationalTotal: 2,
    });
  });
});
