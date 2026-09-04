import { describe, expect, it } from "vitest";

import { CHANGELOG } from "@/data/changelog";

describe("CHANGELOG", () => {
  it("only contains user-facing OPC policy and intel collection updates", () => {
    const engineeringTerms = [
      "npm",
      "/monitor",
      "/api",
      "Supabase",
      "Netlify",
      "GitHub",
      "schema",
      "测试",
      "校验",
      "采集器",
    ];

    for (const entry of CHANGELOG) {
      const text = `${entry.summary} ${entry.detail ?? ""}`;
      expect(engineeringTerms.some((term) => text.includes(term))).toBe(false);
    }
  });
});
