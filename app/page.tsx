import { ExternalLink } from "lucide-react";

import { GlobalSearch } from "@/components/GlobalSearch";
import { IntelKindChip } from "@/components/intel/IntelKindChip";
import { PolicyExplorer } from "@/components/PolicyExplorer";
import { getMonitorOverview } from "@/lib/intel";
import { getPolicies, getProvinceSummaries } from "@/lib/policies";

function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="OPC Policy Map 首页">
        <span className="brand-mark" aria-hidden="true">
          OP
        </span>
        <span>
          <strong>OPC POLICY MAP</strong>
          <small>全国 OPC / AI / 创业政策地图</small>
        </span>
      </a>
      <nav aria-label="主导航">
        <a href="#policy-map" aria-current="page">
          政策地图
        </a>
        <a href="#policy-panel">政策列表</a>
        <a href="/monitor">情报监测</a>
        <a href="#about">关于</a>
      </nav>
    </header>
  );
}

function StatsBar({
  policyCount,
  verifiedProvinceCount,
}: {
  policyCount: number;
  verifiedProvinceCount: number;
}) {
  return (
    <section className="stats-bar" aria-label="数据概览">
      <div>
        <span>省级地区覆盖</span>
        <strong>31</strong>
      </div>
      <div>
        <span>已核验地区</span>
        <strong>{verifiedProvinceCount}</strong>
      </div>
      <div>
        <span>政策 / 官方发布</span>
        <strong>{policyCount}</strong>
      </div>
      <div>
        <span>最近更新</span>
        <strong className="date-value">2026-09-03</strong>
      </div>
      <p>
        <span className="status-dot" aria-hidden="true" />
        VERIFIED SOURCES · 官方来源逐条核验
      </p>
    </section>
  );
}

function IntelTeaser() {
  const overview = getMonitorOverview(4);

  return (
    <section id="monitor" className="intel-teaser" aria-labelledby="teaser-title">
      <div className="intel-teaser-head">
        <div>
          <p className="eyebrow">OPC INTEL MONITOR</p>
          <h2 id="teaser-title">情报监控与收纳</h2>
          <p>
            巡检官方来源 → 命中线索进待核验池 → 人工核对后计入已核验库，
            持续收纳申报动态、解读问答、落地案例与资源活动。
          </p>
        </div>
        <a className="teaser-cta" href="/monitor">
          打开完整监测面板
          <ExternalLink aria-hidden="true" className="size-4" strokeWidth={1.6} />
        </a>
      </div>

      <div className="teaser-body">
        <dl className="teaser-stats" aria-label="监控规模">
          <div>
            <dt>监控来源</dt>
            <dd>{overview.sourceStats.total}</dd>
          </div>
          <div>
            <dt>自动巡检</dt>
            <dd>{overview.sourceStats.enabled}</dd>
          </div>
          <div>
            <dt>待核验线索</dt>
            <dd>{overview.pool.total}</dd>
          </div>
          <div>
            <dt>覆盖省份</dt>
            <dd>{overview.verifiedStats.provincesCovered.length}</dd>
          </div>
        </dl>

        <ul className="teaser-list" aria-label="最近已核验收录">
          {overview.recent.map((item) => (
            <li key={item.id}>
              <IntelKindChip kind={item.kind} />
              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                {item.title}
              </a>
              <time dateTime={item.publishDate}>
                {item.publishDate ?? item.discoveredAt}
              </time>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function Home() {
  const summaries = getProvinceSummaries();
  const policyCount = getPolicies().length;
  const verifiedProvinceCount = summaries.filter(
    (province) => province.policyCount > 0,
  ).length;

  return (
    <div id="top" className="app-shell">
      <SiteHeader />
      <main id="policy-map">
        <section className="intro">
          <div>
            <p className="eyebrow">CHINA · POLICY INTELLIGENCE</p>
            <h1>从地区出发，快速读懂创业政策</h1>
          </div>
          <div className="intro-side">
            <p>
              覆盖中国大陆 31 个省级地区，聚合直接面向 OPC 的专项政策与
              明确纳入 AI 一人公司的相关支持，并保留原文、文号与核验状态。
            </p>
            <GlobalSearch />
          </div>
        </section>

        <StatsBar
          policyCount={policyCount}
          verifiedProvinceCount={verifiedProvinceCount}
        />

        <div id="policy-panel">
          <PolicyExplorer summaries={summaries} />
        </div>

        <IntelTeaser />
      </main>
      <footer id="about">
        <p>政策信息整理于 2026-09-03，不构成申报或法律意见。</p>
        <p>政策可能动态调整，请以原文及主管部门最新口径为准。</p>
      </footer>
    </div>
  );
}
