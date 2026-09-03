import { describe, expect, it } from "vitest";

import { getApplicationLeads } from "@/lib/applications";

describe("application leads", () => {
  it("extracts real application notices without inventing windows", () => {
    const leads = getApplicationLeads();

    expect(leads.length).toBeGreaterThanOrEqual(3);
    expect(leads.some((lead) => lead.item.kind === "application")).toBe(true);
    // 全部线索必须可回溯到官方原文，且不做编造的日期判断
    for (const lead of leads) {
      expect(lead.item.sourceUrl.startsWith("http")).toBe(true);
      expect(lead.hint.length).toBeGreaterThan(0);
    }
  });

  it("ranks open/upcoming leads before unknown and past ones", () => {
    const leads = getApplicationLeads();
    const rank = { open: 0, upcoming: 1, rolling: 2, past: 3, unknown: 4 };

    for (let index = 1; index < leads.length; index += 1) {
      const prev = rank[leads[index - 1].status];
      const current = rank[leads[index].status];
      expect(prev).toBeLessThanOrEqual(current);
    }
  });

  it("never fabricates a deadline when window is unknown", () => {
    const leads = getApplicationLeads();

    for (const lead of leads) {
      if (!lead.item.applicationWindow) {
        expect(["rolling", "unknown"]).toContain(lead.status);
      }
    }
  });
});
