"use client";

import { useEffect, useState } from "react";

import { IntelItemCard } from "@/components/intel/IntelItemCard";
import { INTEL_KIND_LABELS, type IntelItem, type IntelKind } from "@/types/intel";

type RequestStatus = "loading" | "success" | "error";

const KIND_ORDER: IntelKind[] = [
  "policy",
  "application",
  "interpretation",
  "news",
  "resource",
];

interface FeedExplorerProps {
  /** 服务端注入的初始省筛选（用于矩阵/链接联动）。 */
  initialProvince?: string | null;
  /** 服务端注入的初始关键词（用于首页全局搜索跳转）。 */
  initialQ?: string | null;
  /** 各省份已核验情报计数（用于类别 Tab）。 */
  kindTotals: Record<IntelKind, number>;
  /** 可选的省份下拉项。 */
  provinceOptions: string[];
  /** 情报总数（显示“共 N 条”）。 */
  totalCount: number;
}

/** 已核验情报的全量可筛选浏览面板（客户端，走 /api/intel）。 */
export function IntelFeedExplorer({
  initialProvince,
  initialQ,
  kindTotals,
  provinceOptions,
  totalCount,
}: FeedExplorerProps) {
  const [kind, setKind] = useState<IntelKind | "all">("all");
  const [province, setProvince] = useState<string>(
    initialProvince && provinceOptions.includes(initialProvince)
      ? initialProvince
      : "all",
  );
  const [q, setQ] = useState(initialQ?.trim() ?? "");
  const [items, setItems] = useState<IntelItem[]>([]);
  const [status, setStatus] = useState<RequestStatus>("loading");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (kind !== "all") params.set("kind", kind);
    if (province !== "all") params.set("province", province);
    if (q.trim()) params.set("q", q.trim());
    fetch(`/api/intel?${params.toString()}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("intel request failed");
        return response.json() as Promise<{ data: IntelItem[] }>;
      })
      .then((body) => {
        setItems(body.data);
        setStatus("success");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [kind, province, q]);

  return (
    <div className="xpl">
      <div className="xpl-bar" role="search">
        <div className="xpl-kinds" role="group" aria-label="按类别筛选">
          {(["all", ...KIND_ORDER] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={kind === key ? "is-active" : ""}
              aria-pressed={kind === key}
              onClick={() => setKind(key)}
            >
              {key === "all" ? "全部" : INTEL_KIND_LABELS[key]}
              {key === "all" ? totalCount : kindTotals[key]}
            </button>
          ))}
        </div>
        <div className="xpl-controls">
          <label>
            <span>地区</span>
            <select
              aria-label="按地区筛选"
              value={province}
              onChange={(event) => setProvince(event.target.value)}
            >
              <option value="all">全部地区</option>
              {provinceOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <input
            type="search"
            placeholder="搜索标题 / 摘要 / 标签 / 文号…"
            aria-label="关键词搜索"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
      </div>

      <p className="xpl-result" role="status" aria-live="polite">
        {status === "loading" && "正在加载情报…"}
        {status === "success" && `共 ${items.length} 条已核验情报`}
        {status === "error" && "加载失败，请稍后重试"}
      </p>

      {status === "success" && items.length === 0 && (
        <div className="mon-empty">
          <strong>没有符合条件的情报</strong>
          <span>换一组类别/地区/关键词试试；空白地区可能是“未收录 ≠ 不存在”，详见下方覆盖矩阵。</span>
        </div>
      )}

      <div className="mon-feed">
        {items.map((item) => (
          <IntelItemCard item={item} key={item.id} />
        ))}
      </div>
    </div>
  );
}
