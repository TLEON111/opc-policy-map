import { describe, expect, it } from "vitest";

import { MONITOR_SOURCES } from "@/data/monitor-sources";

describe("MONITOR_SOURCES", () => {
  it("registers official city and district sources where verified OPC items already appeared", () => {
    const ids = MONITOR_SOURCES.map((source) => source.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        "sz-gov-tzgg",
        "wh-kjj-tzgg",
        "dl-hitech-policy",
        "gz-haizhu-gfxwj",
        "nb-gov-policy",
        "wx-amr",
        "bj-hd-opc",
        "bj-sjs-news",
      ]),
    );
  });

  it("keeps the monitor source ids unique", () => {
    const ids = MONITOR_SOURCES.map((source) => source.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
