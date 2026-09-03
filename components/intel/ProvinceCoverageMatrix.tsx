import type { ProvinceCoverageRow } from "@/lib/intel";

const TIER_LABELS: Record<ProvinceCoverageRow["coverage"], string> = {
  direct: "直接政策",
  policy: "相关政策",
  intel: "情报动态",
  none: "待跟踪",
};

/** 31 省覆盖矩阵（纯展示；点击省份跳转 /monitor?province=X#intel-feed）。 */
export function ProvinceCoverageMatrix({
  rows,
  baseHref = "/monitor",
}: {
  rows: ProvinceCoverageRow[];
  baseHref?: string;
}) {
  const countByTier = (tier: ProvinceCoverageRow["coverage"]) =>
    rows.filter((row) => row.coverage === tier).length;

  return (
    <div className="cov">
      <div className="cov-legend" aria-label="覆盖状态图例">
        <span className="cov-key is-direct">直接政策</span>
        <span className="cov-key is-policy">相关政策</span>
        <span className="cov-key is-intel">情报动态</span>
        <span className="cov-key is-none">待跟踪</span>
        <small>
          直接政策 {countByTier("direct")} · 相关政策 {countByTier("policy")} ·
          情报动态 {countByTier("intel")} · 待跟踪 {countByTier("none")}
        </small>
      </div>
      <ul className="cov-grid" aria-label="31 个省级地区覆盖矩阵">
        {rows.map((row) => (
          <li key={row.name} className={`cov-cell is-${row.coverage}`}>
            <a
              href={row.coverage === "none" ? undefined : `${baseHref}?province=${encodeURIComponent(row.name)}#intel-feed`}
              title={
                row.coverage === "none"
                  ? `${row.name}：暂未核验到政策/情报（未收录≠不存在）`
                  : `${row.name}：${TIER_LABELS[row.coverage]}（政策 ${row.policyTotal} · 情报 ${row.intelTotal}）`
              }
            >
              <strong>{row.name}</strong>
              <span className="cov-count">
                {row.coverage === "none"
                  ? "—"
                  : row.policyTotal > 0
                    ? `政${row.policyTotal}`
                    : `情${row.intelTotal}`}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
