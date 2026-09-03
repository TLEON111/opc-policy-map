"use client";

import * as echarts from "echarts";
import { useEffect, useMemo, useRef, useState } from "react";

import type { CoverageStatus, ProvinceSummary } from "@/types/policy";

const MAP_NAME = "china-provinces";
let mapRegistration: Promise<void> | null = null;

export function getMapFill(coverageStatus: CoverageStatus) {
  if (coverageStatus === "direct") return "#365c8d";
  if (coverageStatus === "related") return "#a9bdd2";
  return "#e8edf3";
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

export function formatProvinceTooltip(
  provinceName: string,
  summary?: ProvinceSummary,
) {
  const name = escapeHtml(provinceName);
  const total = summary?.policyCount ?? 0;
  const direct = summary?.directPolicyCount ?? 0;
  const related = summary?.relatedPolicyCount ?? 0;

  return [
    `<div class="map-tooltip"><strong>${name}</strong>`,
    `<span>本地已核验：${total}</span>`,
    `<span>直接OPC政策：${direct}</span>`,
    `<span>相关支撑政策：${related}</span>`,
    `<em>${total > 0 ? "点击查看 →" : "暂未核验到本地政策"}</em></div>`,
  ].join("");
}

function ensureMapRegistered() {
  if (!mapRegistration) {
    mapRegistration = fetch("/maps/china-provinces.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error("地图数据加载失败");
        }
        return response.json();
      })
      .then((geoJson: Parameters<typeof echarts.registerMap>[1]) => {
        echarts.registerMap(MAP_NAME, geoJson);
      });
  }

  return mapRegistration;
}

function buildMapOption(
  summaries: ProvinceSummary[],
  selectedProvince: string,
): echarts.EChartsOption {
  const summaryByName = new Map(summaries.map((summary) => [summary.name, summary]));

  return {
    animationDurationUpdate: 220,
    aria: {
      enabled: true,
      description: "中国省级OPC政策地图，深色表示已核验到直接OPC政策。",
    },
    tooltip: {
      trigger: "item",
      borderWidth: 0,
      padding: 0,
      backgroundColor: "transparent",
      extraCssText: "box-shadow:none;",
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const name = item && typeof item.name === "string" ? item.name : "";
        return formatProvinceTooltip(name, summaryByName.get(name));
      },
    },
    series: [
      {
        type: "map",
        map: MAP_NAME,
        roam: true,
        scaleLimit: { min: 0.85, max: 5 },
        zoom: 1.08,
        selectedMode: "single",
        label: {
          show: false,
          color: "#334155",
          fontSize: 10,
        },
        emphasis: {
          label: { show: true, color: "#0f172a", fontWeight: 600 },
          itemStyle: {
            areaColor: "#9db3ce",
            borderColor: "#ffffff",
            borderWidth: 1.2,
          },
        },
        select: {
          label: { show: true, color: "#ffffff", fontWeight: 600 },
          itemStyle: { areaColor: "#244f7d", borderColor: "#ffffff" },
        },
        itemStyle: {
          areaColor: getMapFill("none"),
          borderColor: "#ffffff",
          borderWidth: 1,
        },
        data: summaries.map((summary) => ({
          name: summary.name,
          value: summary.policyCount,
          selected: summary.name === selectedProvince,
          itemStyle: { areaColor: getMapFill(summary.coverageStatus) },
        })),
      },
    ],
  };
}

interface ChinaMapProps {
  summaries: ProvinceSummary[];
  selectedProvince: string;
  onProvinceSelect: (provinceName: string) => void;
}

export function ChinaMap({
  summaries,
  selectedProvince,
  onProvinceSelect,
}: ChinaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const propsRef = useRef({ summaries, selectedProvince, onProvinceSelect });
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const verifiedProvinces = useMemo(
    () => summaries.filter((summary) => summary.policyCount > 0),
    [summaries],
  );

  useEffect(() => {
    propsRef.current = { summaries, selectedProvince, onProvinceSelect };
  }, [onProvinceSelect, selectedProvince, summaries]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = echarts.init(containerRef.current, undefined, {
      renderer: "canvas",
    });
    chartRef.current = chart;

    const handleClick = (event: { name?: string }) => {
      if (event.name) {
        propsRef.current.onProvinceSelect(event.name);
      }
    };
    const handleResize = () => chart.resize();
    let isActive = true;
    chart.on("click", handleClick);
    window.addEventListener("resize", handleResize);

    ensureMapRegistered()
      .then(() => {
        if (!isActive) return;
        const current = propsRef.current;
        chart.setOption(
          buildMapOption(current.summaries, current.selectedProvince),
        );
        setMapStatus("ready");
      })
      .catch(() => {
        if (isActive) setMapStatus("error");
      });

    return () => {
      isActive = false;
      window.removeEventListener("resize", handleResize);
      chart.off("click", handleClick);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapStatus === "ready" && chartRef.current) {
      chartRef.current.setOption(buildMapOption(summaries, selectedProvince));
      chartRef.current.dispatchAction(
        { type: "select", seriesIndex: 0, name: selectedProvince },
        { silent: true },
      );
    }
  }, [mapStatus, selectedProvince, summaries]);

  return (
    <section className="map-card" aria-labelledby="map-title">
      <div className="map-card-heading">
        <div>
          <p className="eyebrow">POLICY COVERAGE</p>
          <h2 id="map-title" className="mt-2 text-xl font-semibold text-slate-950">
            全国政策分布
          </h2>
        </div>
        <div className="map-hint" aria-hidden="true">
          拖动 · 缩放 · 点击省份
        </div>
      </div>

      <div className="map-stage">
        <div
          ref={containerRef}
          className="h-full min-h-[420px] w-full"
          role="img"
          aria-label="中国省级政策地图"
        />
        {mapStatus === "loading" && (
          <div className="map-state" role="status">
            正在加载地图…
          </div>
        )}
        {mapStatus === "error" && (
          <div className="map-state text-red-700" role="alert">
            地图加载失败，请刷新页面重试。
          </div>
        )}
      </div>

      <div className="map-footer">
        <div className="map-legend" aria-label="政策核验状态图例">
          {[
            ["#e8edf3", "暂未核验"],
            ["#a9bdd2", "相关支撑"],
            ["#365c8d", "直接 OPC"],
          ].map(([color, label]) => (
            <span key={label}>
              <i style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
        <label className="province-select">
          <span>全部地区</span>
          <select
            aria-label="选择省级地区"
            value={selectedProvince}
            onChange={(event) => onProvinceSelect(event.target.value)}
          >
            {summaries.map((summary) => (
              <option key={summary.name} value={summary.name}>
                {summary.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="province-shortcuts" role="group" aria-label="已核验地区快捷选择">
        {verifiedProvinces.map((summary) => (
          <button
            key={summary.name}
            type="button"
            className={summary.name === selectedProvince ? "is-active" : ""}
            aria-pressed={summary.name === selectedProvince}
            onClick={() => onProvinceSelect(summary.name)}
          >
            {summary.name}
          </button>
        ))}
      </div>
    </section>
  );
}
