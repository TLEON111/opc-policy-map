"use client";

import { useCallback, useEffect, useState } from "react";

import { ChinaMap } from "@/components/ChinaMap";
import { PolicyDrawer } from "@/components/PolicyDrawer";
import type { PoliciesResponse, Policy, ProvinceSummary } from "@/types/policy";

type RequestStatus = "loading" | "success" | "error";

function normalizeProvinceName(name: string) {
  return name.replace(
    /(壮族自治区|回族自治区|维吾尔自治区|特别行政区|自治区|省|市)$/,
    "",
  );
}

export function PolicyExplorer({
  summaries,
}: {
  summaries: ProvinceSummary[];
}) {
  const [selectedProvince, setSelectedProvince] = useState("北京");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [status, setStatus] = useState<RequestStatus>("loading");
  const selectedSummary = summaries.find(
    (summary) => summary.name === selectedProvince,
  ) ?? {
    name: selectedProvince,
    englishName: selectedProvince.toUpperCase(),
    policyCount: 0,
    directPolicyCount: 0,
    relatedPolicyCount: 0,
    coverageStatus: "none" as const,
    categoryCounts: {},
    lastVerifiedAt: "2026-09-03",
  };

  const handleProvinceSelect = useCallback((name: string) => {
    const normalizedName = normalizeProvinceName(name);
    if (selectedProvince === normalizedName) return;
    setPolicies([]);
    setStatus("loading");
    setSelectedProvince(normalizedName);
  }, [selectedProvince]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/policies?province=${encodeURIComponent(selectedProvince)}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Policy request failed");
        }
        return response.json() as Promise<PoliciesResponse>;
      })
      .then((response) => {
        setPolicies(response.data);
        setStatus("success");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });

    return () => controller.abort();
  }, [selectedProvince]);

  return (
    <div className="explorer-grid">
      <ChinaMap
        summaries={summaries}
        selectedProvince={selectedProvince}
        onProvinceSelect={handleProvinceSelect}
      />
      <PolicyDrawer
        key={selectedProvince}
        province={selectedSummary}
        policies={policies}
        status={status}
      />
    </div>
  );
}
