import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IntelFeedExplorer } from "@/components/intel/IntelFeedExplorer";
import type { IntelKind } from "@/types/intel";

const kindTotals: Record<IntelKind, number> = {
  policy: 1,
  application: 0,
  interpretation: 0,
  news: 0,
  resource: 0,
};

describe("IntelFeedExplorer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the feed using the initial global keyword", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(
      <IntelFeedExplorer
        initialQ="算力券"
        kindTotals={kindTotals}
        provinceOptions={["北京"]}
        totalCount={1}
      />,
    );

    expect(screen.getByRole("searchbox", { name: "关键词搜索" })).toHaveValue("算力券");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/intel?q=${encodeURIComponent("算力券")}`,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });
});
