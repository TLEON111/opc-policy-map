"use client";

import { useMemo, useState } from "react";

import { PolicyCard } from "@/components/PolicyCard";
import type { Policy, PolicyRelevance, ProvinceSummary } from "@/types/policy";

type RequestStatus = "loading" | "success" | "error";
type PolicyFilter = "all" | PolicyRelevance;

function displayProvinceName(name: string) {
  if (["北京", "上海", "重庆", "天津"].includes(name)) return `${name}市`;
  if (["内蒙古", "广西", "西藏", "宁夏", "新疆"].includes(name)) return name;
  return `${name}省`;
}

interface PolicyDrawerProps {
  province: ProvinceSummary;
  policies: Policy[];
  status: RequestStatus;
}

export function PolicyDrawer({ province, policies, status }: PolicyDrawerProps) {
  const [filter, setFilter] = useState<PolicyFilter>("all");
  const directCount = policies.filter((policy) => policy.relevance === "direct").length;
  const relatedCount = policies.length - directCount;
  const filteredPolicies = useMemo(
    () =>
      filter === "all"
        ? policies
        : policies.filter((policy) => policy.relevance === filter),
    [filter, policies],
  );

  return (
    <aside className="policy-panel" aria-labelledby="policy-panel-title">
      <div className="policy-panel-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">SELECTED REGION</p>
            <h2 id="policy-panel-title">{displayProvinceName(province.name)}</h2>
            <p className="region-english">{province.englishName}</p>
          </div>
          <div className="count-mark" aria-label={`${province.policyCount} 条本地政策`}>
            <strong>{province.policyCount}</strong>
            <span>本地政策</span>
          </div>
        </div>

        <div className="coverage-line">
          <span className={`coverage-dot is-${province.coverageStatus}`} aria-hidden="true" />
          {province.coverageStatus === "direct"
            ? `已核验 ${province.directPolicyCount} 条直接 OPC 政策`
            : province.coverageStatus === "related"
              ? `已核验 ${province.relatedPolicyCount} 条相关支撑政策`
              : "暂未核验到本地直接政策"}
          <small>截至 {province.lastVerifiedAt}</small>
        </div>

        <div className="policy-filters" role="group" aria-label="按政策相关性筛选">
          {[
            ["all", "全部", policies.length],
            ["direct", "直接 OPC", directCount],
            ["related", "相关支撑", relatedCount],
          ].map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "is-active" : ""}
              aria-pressed={filter === value}
              onClick={() => setFilter(value as PolicyFilter)}
            >
              {label} {count}
            </button>
          ))}
        </div>
      </div>

      <div className="policy-list" aria-live="polite">
        {status === "loading" && (
          <div className="state-card" role="status">
            <span className="loading-dot" aria-hidden="true" />
            正在加载{province.name}政策…
          </div>
        )}

        {status === "error" && (
          <div className="state-card text-red-700" role="alert">
            政策加载失败，请稍后重试。
          </div>
        )}

        {status === "success" && province.policyCount === 0 && (
          <div className="coverage-notice">
            <strong>暂未核验到{province.name}本地 OPC 政策</strong>
            <span>下方仍保留全国通用政策。未收录不等于当地不存在支持，请以主管部门最新发布为准。</span>
          </div>
        )}

        {status === "success" && filteredPolicies.length === 0 && (
          <div className="state-card">
            当前筛选条件下没有已核验政策。
          </div>
        )}

        {status === "success" &&
          filteredPolicies.map((policy) => <PolicyCard policy={policy} key={policy.id} />)}
      </div>
    </aside>
  );
}
