import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ExternalLink,
  Map as MapIcon,
  Radio,
  ShieldCheck,
  Layers,
} from "lucide-react";

import { ApplicationLeads } from "@/components/applications/ApplicationLeads";
import { IntelFeedExplorer } from "@/components/intel/IntelFeedExplorer";
import { ProvinceCoverageMatrix } from "@/components/intel/ProvinceCoverageMatrix";
import { getApplicationLeads } from "@/lib/applications";
import {
  getChangelog,
  getMonitorRuntimeData,
  getProvinceCoverageMatrix,
} from "@/lib/intel";

export const dynamic = "force-dynamic";

function SectionHeading({
  icon,
  eyebrow,
  title,
  count,
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  count?: number;
  children?: ReactNode;
}) {
  return (
    <div className="mon-section-head">
      <div className="mon-section-title">
        <span className="mon-section-icon">{icon}</span>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>
            {title}
            {typeof count === "number" && <em>{count}</em>}
          </h2>
        </div>
      </div>
      {children}
    </div>
  );
}

export default async function MonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ province?: string; q?: string }>;
}) {
  const { province: provinceParam, q } = await searchParams;
  const { overview, poolEntries } = await getMonitorRuntimeData(8);
  const changelog = getChangelog();
  const matrixRows = getProvinceCoverageMatrix();
  const applicationLeads = getApplicationLeads();
  const coveredProvinceOptions = matrixRows
    .filter((row) => row.coverage !== "none")
    .map((row) => row.name);
  const isPoolSnapshot = overview.sourceHealthMode === "pool-snapshot";
  const sourceNameById = new Map(
    overview.sources.map((source) => [source.id, source.name]),
  );

  return (
    <div className="app-shell mon-page">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="返回 OPC 政策地图首页">
          <span className="brand-mark" aria-hidden="true">
            OP
          </span>
          <span>
            <strong>OPC INTEL MONITOR</strong>
            <small>情报监控与收纳面板</small>
          </span>
        </Link>
        <nav aria-label="主导航">
          <Link href="/">政策地图</Link>
          <a href="#intel-coverage">覆盖矩阵</a>
          <a href="#intel-apply">申报提醒</a>
          <a href="#intel-feed" aria-current="page">
            情报浏览
          </a>
          <a href="#intel-pool">待核验池</a>
          <a href="#intel-sources">监控来源</a>
        </nav>
      </header>

      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">MONITOR · VERIFY · COLLECT</p>
            <h1>OPC 情报监控与收纳</h1>
          </div>
          <p>
            系统巡检 44 个官方来源（2026-09-03 实测可达性），自动收纳五类
            OPC 信息；巡检命中的线索先进入待核验池，人工核对原文后才计入已核验库。
          </p>
        </section>

        <section className="mon-stats" aria-label="监控概览">
          <div>
            <span>登记监控来源</span>
            <strong>{overview.sourceStats.total}</strong>
            <small>自动巡检 {overview.sourceStats.enabled}</small>
          </div>
          <div>
            <span>来源状态</span>
            <strong>{overview.sourceStats.reachable}</strong>
            <small>
              {isPoolSnapshot ? "池内命中来源" : "待接入"} {overview.sourceStats.pending}
            </small>
          </div>
          <div>
            <span>已核验情报</span>
            <strong>{overview.verifiedStats.total}</strong>
            <small>五类合计</small>
          </div>
          <div>
            <span>待核验线索</span>
            <strong>{overview.pool.total}</strong>
            <small>巡检命中</small>
          </div>
          <div>
            <span>情报覆盖省份</span>
            <strong>{overview.verifiedStats.provincesCovered.length}</strong>
            <small>本地 + 全国条目</small>
          </div>
        </section>

        <section id="intel-apply" className="mon-section" aria-labelledby="apply-title">
          <SectionHeading
            icon={<CalendarClock aria-hidden="true" className="size-4" />}
            eyebrow="APPLICATION TRACKER"
            title="申报与受理提醒"
            count={applicationLeads.length}
          >
            <span className="mon-updated">
              仅标注原文明确给出的窗口；否则一律显示「窗口以原文为准」
            </span>
          </SectionHeading>
          <ApplicationLeads leads={applicationLeads} />
        </section>

        <section id="intel-coverage" className="mon-section" aria-labelledby="coverage-title">
          <SectionHeading
            icon={<MapIcon aria-hidden="true" className="size-4" />}
            eyebrow="31-PROVINCE MATRIX"
            title="省级覆盖矩阵"
          />
          <ProvinceCoverageMatrix rows={matrixRows} />
        </section>

        <section id="intel-feed" className="mon-section" aria-labelledby="feed-title">
          <SectionHeading
            icon={<ShieldCheck aria-hidden="true" className="size-4" />}
            eyebrow="VERIFIED FEED"
            title="已核验情报浏览"
            count={overview.verifiedStats.total}
          />
          <IntelFeedExplorer
            initialProvince={provinceParam}
            initialQ={q}
            kindTotals={overview.verifiedStats.byKind}
            provinceOptions={coveredProvinceOptions}
            totalCount={overview.verifiedStats.total}
          />
        </section>

        <section id="intel-pool" className="mon-section" aria-labelledby="pool-title">
          <SectionHeading
            icon={<Layers aria-hidden="true" className="size-4" />}
            eyebrow="DISCOVERY POOL"
            title="待核验池"
            count={overview.pool.total}
          >
            <span className="mon-updated">
              最近巡检：{overview.pool.updatedAt?.replace("T", " ").slice(0, 16) ?? "尚未运行"} · UTC
            </span>
          </SectionHeading>
          {poolEntries.length === 0 ? (
            <div className="mon-empty">
              <strong>待核验池为空</strong>
              <span>
                在项目目录运行 <code>npm run collect</code> 巡检官方来源，命中关键词的线索会自动写入这里。
              </span>
            </div>
          ) : (
            <ul className="mon-pool">
              {poolEntries.map((entry) => (
                <li key={entry.url}>
                  <div>
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mon-pool-title"
                    >
                      {entry.title}
                      <ExternalLink
                        aria-hidden="true"
                        className="size-3 opacity-60"
                        strokeWidth={1.8}
                      />
                    </a>
                    <p className="mon-meta">
                      <span>{sourceNameById.get(entry.sourceId) ?? entry.sourceId}</span>
                      {entry.province && <span>{entry.province}</span>}
                      <span>{entry.foundAt.replace("T", " ").slice(0, 16)}</span>
                    </p>
                  </div>
                  <span className="mon-keyword">命中词：{entry.keyword}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="intel-sources" className="mon-section" aria-labelledby="sources-title">
          <SectionHeading
            icon={<Radio aria-hidden="true" className="size-4" />}
            eyebrow="SOURCE REGISTRY"
            title="监控中的官方来源"
            count={overview.sourceStats.enabled}
          >
            <span className="mon-updated">
              {overview.sourceReportCheckedAt
                ? `${isPoolSnapshot ? "远程池最新线索" : "最近巡检"}：${overview.sourceReportCheckedAt.replace("T", " ").slice(0, 16)} UTC · ${isPoolSnapshot ? "命中来源" : "可达"} ${overview.sourceStats.reachable}/${overview.sourceStats.enabled}`
                : "尚未运行巡检；下方为 2026-09-03 可达性探测快照"}
            </span>
          </SectionHeading>
          <div className="mon-table-wrap">
            <table className="mon-table">
              <thead>
                <tr>
                  <th>来源</th>
                  <th>层级 / 地区</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {overview.sourceHealth.map((source) => (
                  <tr key={source.id}>
                    <td>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mon-source-link"
                      >
                        {source.name}
                        <ExternalLink
                          aria-hidden="true"
                          className="size-3 opacity-60"
                          strokeWidth={1.8}
                        />
                      </a>
                      {source.note && <small>{source.note}</small>}
                    </td>
                    <td>
                      <span className="mon-level">{source.level === "national" ? "国家级" : source.owner}</span>
                    </td>
                    <td>
                      {source.state === "reachable" ? (
                        <span className="mon-state is-ok">
                          巡检可达
                          {source.hitCount ? ` · 命中 ${source.hitCount}` : ""}
                        </span>
                      ) : source.state === "failed" ? (
                        <span className="mon-state is-fail">巡检失败</span>
                      ) : source.state === "quiet" ? (
                        <span className="mon-state is-wait">暂无待核验命中</span>
                      ) : (
                        <span className="mon-state is-wait">待接入</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mon-section" aria-labelledby="changelog-title">
          <SectionHeading
            icon={<ShieldCheck aria-hidden="true" className="size-4" />}
            eyebrow="CHANGELOG"
            title="收录与更新日志"
          />
          <ul className="mon-changelog">
            {changelog.map((entry) => (
              <li key={`${entry.date}-${entry.summary}`}>
                <time dateTime={entry.date}>{entry.date}</time>
                <div>
                  <strong>{entry.summary}</strong>
                  {entry.detail && <p>{entry.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer id="about">
        <p>巡检命中 ≠ 已核验：所有信息以官方原文为准，收录前逐条人工核对。</p>
        <p>来源可达性可能变化，建议定期运行采集并复查链接。整理于 2026-09-03，不构成申报或法律意见。</p>
      </footer>
    </div>
  );
}
