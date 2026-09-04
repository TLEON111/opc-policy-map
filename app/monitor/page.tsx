import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ChevronDown,
  ExternalLink,
  Map as MapIcon,
  Radio,
  ShieldCheck,
  Layers,
} from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
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
  const sourceHealthModeLabel =
    overview.sourceHealthMode === "persisted-checks"
      ? "巡检存档（最近一次）"
      : overview.sourceHealthMode === "pool-snapshot"
        ? "远程池最新线索"
        : "最近巡检";
  const sourceHealthMetricLabel =
    overview.sourceHealthMode === "pool-snapshot" ? "命中来源" : "可达";
  const sourceNameById = new Map(
    overview.sources.map((source) => [source.id, source.name]),
  );

  return (
    <div className="app-shell mon-page">
      <a className="skip-link" href="#monitor-main">跳到主要内容</a>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="返回 OPC 政策地图首页">
          <BrandLogo />
        </Link>
        <nav aria-label="主导航">
          <Link href="/">政策地图</Link>
          <a href="#intel-coverage" aria-current="page">
            覆盖矩阵
          </a>
          <a href="#intel-feed">情报浏览</a>
          <a href="#intel-apply">申报提醒</a>
          <a href="#intel-pool">待核验池</a>
          <a href="#intel-sources">监控来源</a>
        </nav>
      </header>

      <main id="monitor-main">
        <section className="intro">
          <div>
            <p className="eyebrow">MONITOR · VERIFY · COLLECT</p>
            <h1>OPC 情报监控与收纳</h1>
          </div>
          <p>
            系统巡检 {overview.sourceStats.total} 个官方来源，自动收纳五类
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
              {overview.sourceHealthMode === "pool-snapshot"
                ? "池内命中来源"
                : "未接入/异常"}
              {" "}{overview.sourceStats.pending}
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

        <section id="intel-pool" className="mon-section" aria-labelledby="pool-title">
          <details className="mon-module" open>
            <summary>
              <SectionHeading
                icon={<Layers aria-hidden="true" className="size-4" />}
                eyebrow="DISCOVERY POOL"
                title="待核验池"
                count={overview.pool.total}
              >
                <span className="mon-fold-hint">
                  <ChevronDown aria-hidden="true" className="size-4" strokeWidth={1.8} />
                  <span className="fold-on">折叠本段</span>
                  <span className="fold-off">展开本段</span>
                </span>
                <span className="mon-updated">
                  最近巡检：{overview.pool.updatedAt?.replace("T", " ").slice(0, 16) ?? "尚未运行"} · UTC
                </span>
              </SectionHeading>
            </summary>
            <div className="mon-module-body">
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
                      <details className="mon-details">
                        <summary>
                          <span className="mon-pool-title">
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {entry.title}
                              <ExternalLink
                                aria-hidden="true"
                                className="size-3 opacity-60"
                                strokeWidth={1.8}
                              />
                            </a>
                          </span>
                          <span className="mon-keyword">命中词：{entry.keyword}</span>
                        </summary>
                        <div className="mon-details-body">
                          <p className="mon-meta">
                            <span>{sourceNameById.get(entry.sourceId) ?? entry.sourceId}</span>
                            {entry.province && <span>{entry.province}</span>}
                            <span>发现 {entry.foundAt.replace("T", " ").slice(0, 16)}</span>
                            <span>来源ID {entry.sourceId}</span>
                          </p>
                          <p className="mon-note">
                            这是自动巡检官方来源时命中的线索，尚未人工核验；点击上方标题可查看官方原文，
                            人工核对后才会计入已核验库。
                          </p>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </section>

        <section id="intel-sources" className="mon-section" aria-labelledby="sources-title">
          <details className="mon-module" open>
            <summary>
              <SectionHeading
                icon={<Radio aria-hidden="true" className="size-4" />}
                eyebrow="SOURCE REGISTRY"
                title="监控中的官方来源"
                count={overview.sourceStats.enabled}
              >
                <span className="mon-fold-hint">
                  <ChevronDown aria-hidden="true" className="size-4" strokeWidth={1.8} />
                  <span className="fold-on">折叠本段</span>
                  <span className="fold-off">展开本段</span>
                </span>
                <span className="mon-updated">
                  {overview.sourceReportCheckedAt
                    ? `${sourceHealthModeLabel}：${overview.sourceReportCheckedAt.replace("T", " ").slice(0, 16)} UTC · ${sourceHealthMetricLabel} ${overview.sourceStats.reachable}/${overview.sourceStats.enabled}`
                    : "尚未运行巡检；下方为可达性探测快照"}
                </span>
              </SectionHeading>
            </summary>
            <div className="mon-module-body">
              <ul className="mon-source-list">
                {overview.sourceHealth.map((source) => {
                  const stateLabel =
                    source.state === "reachable"
                      ? "巡检可达"
                      : source.state === "failed"
                        ? "巡检失败"
                        : source.state === "quiet"
                          ? "暂无待核验命中"
                          : "待接入";
                  const stateClass =
                    source.state === "reachable"
                      ? "is-ok"
                      : source.state === "failed"
                        ? "is-fail"
                        : "is-wait";
                  return (
                    <li key={source.id}>
                      <details className="mon-details">
                        <summary>
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
                          <span className="mon-level">{source.level === "national" ? "国家级" : source.owner}</span>
                          <span className={`mon-state ${stateClass}`}>{stateLabel}{source.state === "reachable" && source.hitCount ? ` · ${source.hitCount}` : ""}</span>
                        </summary>
                        <div className="mon-details-body">
                          <p className="mon-meta">
                            <span>{source.url}</span>
                            {source.lastCheckedAt && (
                              <span>检查 {source.lastCheckedAt.replace("T", " ").slice(0, 16)}</span>
                            )}
                          </p>
                          {source.note && <p className="mon-note">{source.note}</p>}
                          {source.state === "reachable" && source.hitCount ? (
                            <p className="mon-note">近一次巡检命中 {source.hitCount} 条线索（自动去重后仍待人工核验）。</p>
                          ) : null}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </div>
          </details>
        </section>

        <section className="mon-section" aria-labelledby="changelog-title">
          <details className="mon-module" open>
            <summary>
              <SectionHeading
                icon={<ShieldCheck aria-hidden="true" className="size-4" />}
                eyebrow="CHANGELOG"
                title="收录与更新日志"
              >
                <span className="mon-fold-hint">
                  <ChevronDown aria-hidden="true" className="size-4" strokeWidth={1.8} />
                  <span className="fold-on">折叠本段</span>
                  <span className="fold-off">展开本段</span>
                </span>
              </SectionHeading>
            </summary>
            <div className="mon-module-body">
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
            </div>
          </details>
        </section>
      </main>

      <footer id="about">
        <p>巡检命中 ≠ 已核验：所有信息以官方原文为准，收录前逐条人工核对。</p>
        <p>来源可达性可能变化，建议定期运行采集并复查链接。整理于 2026-09-03，不构成申报或法律意见。</p>
      </footer>
    </div>
  );
}
