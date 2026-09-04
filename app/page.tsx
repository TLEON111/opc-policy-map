import { BadgeCheck, Clock3, FileText, MapPinned } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { GlobalSearch } from "@/components/GlobalSearch";
import { IntelKindChip } from "@/components/intel/IntelKindChip";
import { PolicyExplorer } from "@/components/PolicyExplorer";
import { getMonitorOverview } from "@/lib/intel";
import { getPolicies, getProvinceSummaries } from "@/lib/policies";

function SiteHeader({ updatedAt }: { updatedAt: string }) {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="OPC Policy Map 首页">
        <BrandLogo />
      </a>
      <nav aria-label="主导航">
        <a href="#policy-map" aria-current="page">
          政策地图
        </a>
        <a href="#policy-panel">政策库</a>
        <a href="/monitor">机会情报</a>
        <a href="#about">关于我们</a>
      </nav>
      <p className="header-update">
        <Clock3 aria-hidden="true" />
        数据更新：{updatedAt}
      </p>
    </header>
  );
}

function StatsBar({
  provinceCount,
  policyCount,
  verifiedProvinceCount,
}: {
  provinceCount: number;
  policyCount: number;
  verifiedProvinceCount: number;
}) {
  return (
    <section className="stats-bar" aria-label="数据概览">
      <div className="stat-item">
        <MapPinned aria-hidden="true" />
        <strong>{provinceCount}</strong>
        <span>省级地区覆盖</span>
      </div>
      <div className="stat-item">
        <FileText aria-hidden="true" />
        <strong>{policyCount}</strong>
        <span>政策与官方发布</span>
      </div>
      <div className="stat-item">
        <BadgeCheck aria-hidden="true" />
        <strong>{verifiedProvinceCount}</strong>
        <span>已核验地区</span>
      </div>
    </section>
  );
}

function LatestIntel() {
  const overview = getMonitorOverview(5);

  return (
    <section id="monitor" className="latest-intel" aria-labelledby="latest-intel-title">
      <div className="latest-intel-head">
        <h2 id="latest-intel-title">最新 OPC 情报</h2>
        <a href="/monitor">
          查看全部 <span aria-hidden="true">→</span>
        </a>
      </div>
      <div className="latest-intel-table" role="table" aria-label="最近已核验 OPC 情报">
        <div className="latest-intel-columns" role="row">
          <span role="columnheader">地区</span>
          <span role="columnheader">类型</span>
          <span role="columnheader">标题</span>
          <span role="columnheader">摘要</span>
          <span role="columnheader">日期</span>
        </div>
        <ul aria-label="最近已核验收录">
          {overview.recent.map((item) => (
            <li key={item.id} role="row">
              <span className="latest-intel-region" role="cell">{item.province}</span>
              <span role="cell"><IntelKindChip kind={item.kind} /></span>
              <a role="cell" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                {item.title}
              </a>
              <span className="latest-intel-summary" role="cell">{item.summary}</span>
              <time role="cell" dateTime={item.publishDate}>
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
  const updatedAt = summaries.reduce(
    (latest, province) =>
      province.lastVerifiedAt > latest ? province.lastVerifiedAt : latest,
    "",
  );

  return (
    <div id="top" className="app-shell">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <SiteHeader updatedAt={updatedAt} />
      <main id="main-content">
        <section className="intro">
          <div>
            <h1>全国 OPC 政策地图</h1>
            <p>从地区出发，找到真正与你有关的政策与机会。</p>
          </div>
          <div className="intro-side">
            <GlobalSearch />
          </div>
        </section>

        <StatsBar
          provinceCount={summaries.length}
          policyCount={policyCount}
          verifiedProvinceCount={verifiedProvinceCount}
        />

        <div id="policy-map">
          <PolicyExplorer summaries={summaries} />
        </div>

        <LatestIntel />
      </main>
      <footer id="about">
        <p>政策信息整理于 2026-09-03，不构成申报或法律意见。</p>
        <p>政策可能动态调整，请以原文及主管部门最新口径为准。</p>
      </footer>
    </div>
  );
}
