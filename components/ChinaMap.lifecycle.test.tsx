import { act, render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChinaMap } from "@/components/ChinaMap";
import type { ProvinceSummary } from "@/types/policy";

const chartMock = vi.hoisted(() => ({
  dispatchAction: vi.fn(),
  dispose: vi.fn(),
  off: vi.fn(),
  on: vi.fn(),
  resize: vi.fn(),
  setOption: vi.fn(),
}));

vi.mock("echarts", () => ({
  init: vi.fn(() => chartMock),
  registerMap: vi.fn(),
}));

const summaries: ProvinceSummary[] = [
  {
    name: "重庆",
    englishName: "CHONGQING",
    policyCount: 3,
    directPolicyCount: 3,
    relatedPolicyCount: 0,
    coverageStatus: "direct",
    categoryCounts: { "OPC创业": 3 },
    lastVerifiedAt: "2026-09-03",
  },
  {
    name: "浙江",
    englishName: "ZHEJIANG",
    policyCount: 3,
    directPolicyCount: 3,
    relatedPolicyCount: 0,
    coverageStatus: "direct",
    categoryCounts: { "OPC创业": 1 },
    lastVerifiedAt: "2026-09-03",
  },
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("ChinaMap lifecycle", () => {
  it("does not update a chart after its component has unmounted", async () => {
    let finishRequest: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise((resolve) => {
        finishRequest = resolve;
      }),
    );

    const view = render(
      <StrictMode>
        <ChinaMap
          summaries={summaries}
          selectedProvince="重庆"
          onProvinceSelect={() => undefined}
        />
      </StrictMode>,
    );
    view.unmount();

    await act(async () => {
      finishRequest?.(
        new Response(JSON.stringify({ type: "FeatureCollection", features: [] })),
      );
      await Promise.resolve();
    });

    expect(chartMock.setOption).not.toHaveBeenCalled();
  });

  it("syncs the chart selection when a shortcut changes the province", async () => {
    const view = render(
      <ChinaMap
        summaries={summaries}
        selectedProvince="重庆"
        onProvinceSelect={() => undefined}
      />,
    );

    await waitFor(() => expect(chartMock.setOption).toHaveBeenCalled());
    chartMock.dispatchAction.mockClear();

    view.rerender(
      <ChinaMap
        summaries={summaries}
        selectedProvince="浙江"
        onProvinceSelect={() => undefined}
      />,
    );

    await waitFor(() =>
      expect(chartMock.dispatchAction).toHaveBeenCalledWith(
        { type: "select", seriesIndex: 0, name: "浙江" },
        { silent: true },
      ),
    );
  });
});
