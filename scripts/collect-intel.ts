/**
 * OPC 信息巡检器（Node ≥ 22 直接运行，erasable-only TypeScript）。
 *
 * 职责：
 *  1. 遍历 data/monitor-sources.ts 中 enabled 的来源；
 *  2. 以浏览器 UA GET 列表页，记录可达性与 HTTP 状态；
 *  3. 对 2xx 页面扫描关键词，命中锚点写入待核验池（data/pool/pool.json），按 URL 去重；
 *  4. 输出同步报告（来源健康度 + 命中统计）。
 *
 * 运行：npm run collect
 * 注意：本脚本只写「待核验池」，绝不写入已核验数据文件。
 */
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { getIntelKeywordHits } from "../lib/intel-keyword-match.ts";
import {
  normalizeIntelCandidateUrl,
  shouldQueueIntelCandidateUrl,
} from "../lib/intel-source-url.ts";
import type { IntelItem, IntelPoolEntry, IntelSource } from "../types/intel.ts";
import type { Policy } from "../types/policy.ts";

const MONITOR_SOURCES = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../data/monitor-sources.json", import.meta.url)),
    "utf8",
  ),
) as IntelSource[];

const VERIFIED_INTEL = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../data/verified-intel.json", import.meta.url)),
    "utf8",
  ),
) as IntelItem[];

const VERIFIED_POLICIES = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../data/verified-policies.json", import.meta.url)),
    "utf8",
  ),
) as Policy[];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const POOL_FILE = fileURLToPath(
  new URL("../data/pool/pool.json", import.meta.url),
);
const LAST_REPORT_FILE = fileURLToPath(
  new URL("../data/pool/last-report.json", import.meta.url),
);
const TIMEOUT_MS = 12_000;

interface RawLink {
  text: string;
  url: string;
}

function absoluteUrl(base: string, href: string): string | null {
  try {
    const parsed = new URL(href, base);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** 依据 HTTP 头 charset 与页面 meta charset 解码。 */
function decodeHtml(buffer: ArrayBuffer, headerCharset?: string): string {
  const utf8 = new TextDecoder("utf-8");
  let html = utf8.decode(buffer);
  const meta = html.match(/charset=["']?([\w-]+)/i);
  const charset = (headerCharset ?? meta?.[1])?.toLowerCase();
  if (charset && charset !== "utf-8" && charset !== "utf8") {
    try {
      html = new TextDecoder(charset).decode(buffer);
    } catch {
      // 未知编码则保留 utf-8 结果
    }
  }
  return html;
}

function extractAnchors(html: string): RawLink[] {
  const anchors: RawLink[] = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const text = match[2]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length >= 4) {
      anchors.push({ text, url: match[1] });
    }
  }
  return anchors;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,*/*" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "follow",
  });
}

async function loadPool(): Promise<IntelPoolEntry[]> {
  try {
    const raw = await readFile(POOL_FILE, "utf8");
    const parsed = JSON.parse(raw) as { entries?: IntelPoolEntry[] };
    return parsed.entries ?? [];
  } catch {
    return [];
  }
}

/** 栏目页分类路径提示词：用于“栏目页自动发现”。 */
const CATEGORY_HINT = /(zcwj|zhengce|policy|zfxxgk|wjfb|tzgg|gonggao|notice|tztg|zhengwu)/i;

/**
 * 栏目页自动发现：扫描列表页内的站内链接，挑出疑似「政策文件/通知公告/信息公开」
 * 类栏目页（最多 6 个、同主机、排除文件附件）。结果仅进报告供人工登记，
 * 不自动写回注册表，避免误收录。
 */
function discoverCategoryColumns(
  anchors: RawLink[],
  base: string,
): string[] {
  const baseHost = new URL(base).host;
  const result: string[] = [];
  const seen = new Set<string>();
  for (const anchor of anchors) {
    const url = absoluteUrl(base, anchor.url);
    if (!url || url.includes("javascript:")) continue;
    try {
      const parsed = new URL(url);
      if (parsed.host !== baseHost) continue;
      if (/\.(pdf|docx?|xlsx?|zip|rar|jpg|jpeg|png|gif)$/i.test(parsed.pathname)) continue;
      if (!CATEGORY_HINT.test(parsed.pathname)) continue;
      const href = parsed.href;
      if (href === base || seen.has(href)) continue;
      seen.add(href);
      result.push(href);
      if (result.length >= 6) break;
    } catch {
      // 忽略不可解析链接
    }
  }
  return result;
}

async function runCollect(): Promise<void> {
  const startedAt = new Date();
  const enabledSources = MONITOR_SOURCES.filter((source) => source.enabled);
  const sourceById = new Map(MONITOR_SOURCES.map((source) => [source.id, source]));
  const verifiedUrls = new Set<string>();
  for (const policy of VERIFIED_POLICIES) {
    const url = normalizeIntelCandidateUrl(policy.sourceUrl);
    if (url) verifiedUrls.add(url);
  }
  for (const intel of VERIFIED_INTEL) {
    const url = normalizeIntelCandidateUrl(intel.sourceUrl);
    if (url) verifiedUrls.add(url);
  }
  const pool = (await loadPool()).flatMap((entry) => {
    const source = sourceById.get(entry.sourceId);
    const url = normalizeIntelCandidateUrl(entry.url);
    if (!url) return [];
    if (verifiedUrls.has(url)) return [];
    if (source && !shouldQueueIntelCandidateUrl(source.url, url)) return [];
    return [{ ...entry, url }];
  });
  const knownUrls = new Set(pool.map((entry) => entry.url));
  const report = {
    checkedAt: startedAt.toISOString(),
    sources: [] as Array<{
      id: string;
      name: string;
      owner: string;
      url: string;
      httpStatus: number | null;
      reachable: boolean;
      error?: string;
      hitCount: number;
      knownHitSkip?: number;
      discoveredColumns?: string[];
    }>,
    discoveredColumns: [] as Array<{ id: string; name: string; urls: string[] }>,
    totals: {
      sourcesTotal: MONITOR_SOURCES.length,
      enabledTotal: enabledSources.length,
      ok: 0,
      failed: 0,
      newPoolEntries: 0,
      knownHitsSkipped: 0,
      discoveredColumns: 0,
      poolTotal: pool.length,
    },
    notes: [] as string[],
  };

  const concurrency = 6;
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < enabledSources.length) {
      const source = enabledSources[cursor++];
      const entry = {
        id: source.id,
        name: source.name,
        owner: source.owner,
        url: source.url,
        httpStatus: null as number | null,
        reachable: false,
        hitCount: 0,
        knownHitSkip: 0,
        discoveredColumns: undefined as string[] | undefined,
        error: undefined as string | undefined,
      };
      try {
        const response = await fetchWithTimeout(source.url);
        entry.httpStatus = response.status;
        if (!response.ok) {
          entry.error = `HTTP ${response.status}`;
          report.notes.push(`[${source.id}] 不可用：HTTP ${response.status}`);
          report.totals.failed += 1;
          report.sources.push(entry);
          continue;
        }
        const buffer = await response.arrayBuffer();
        const html = decodeHtml(buffer, response.headers.get("content-type") ?? undefined);
        const anchors = extractAnchors(html);
        const discovered = discoverCategoryColumns(anchors, source.url);
        if (discovered.length > 0) {
          entry.discoveredColumns = discovered;
          report.discoveredColumns.push({
            id: source.id,
            name: source.name,
            urls: discovered,
          });
          report.totals.discoveredColumns += discovered.length;
        }
        const hits: Array<{ link: RawLink; keywords: string[] }> = [];
        for (const link of anchors) {
          const keywords = getIntelKeywordHits(link.text);
          if (keywords.length > 0) hits.push({ link, keywords });
        }
        entry.hitCount = hits.length;
        if (hits.length > 0) {
          for (const { link, keywords } of hits) {
            const url = absoluteUrl(source.url, link.url);
            if (!url || url.includes("javascript:")) continue;
            const normalizedUrl = normalizeIntelCandidateUrl(url);
            if (!normalizedUrl) continue;
            if (!shouldQueueIntelCandidateUrl(source.url, normalizedUrl)) continue;
            if (knownUrls.has(normalizedUrl) || verifiedUrls.has(normalizedUrl)) {
              entry.knownHitSkip += 1;
              report.totals.knownHitsSkipped += 1;
              continue;
            }
            knownUrls.add(normalizedUrl);
            pool.push({
              url: normalizedUrl,
              title: link.text.slice(0, 120),
              snippet: undefined,
              sourceId: source.id,
              keyword: keywords[0],
              province: source.owner === "全国" ? undefined : source.owner,
              foundAt: new Date().toISOString(),
              status: "pending",
            });
            report.totals.newPoolEntries += 1;
          }
        }
        if (entry.knownHitSkip > 0) {
          report.notes.push(
            `[${source.id}] ${entry.knownHitSkip} 条命中已在池/已核验（自动去重）`,
          );
        }
        entry.reachable = true;
        report.totals.ok += 1;
        source.lastCheckedAt = new Date().toISOString();
        source.reachable = true;
      } catch (error) {
        entry.error =
          error instanceof Error ? error.message : String(error);
        report.notes.push(`[${source.id}] 抓取失败：${entry.error}`);
        report.totals.failed += 1;
      }
      report.sources.push(entry);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, enabledSources.length) }, () => worker()));

  report.totals.poolTotal = pool.length;
  await mkdir(dirname(POOL_FILE), { recursive: true });
  await writeFile(
    POOL_FILE,
    `${JSON.stringify({ updatedAt: startedAt.toISOString(), entries: pool }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    LAST_REPORT_FILE,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  process.stdout.write(`OPC 巡检报告 ${startedAt.toISOString()}\n`);
  process.stdout.write(
    `来源：注册 ${report.totals.sourcesTotal} / 启用 ${report.totals.enabledTotal} / 可达 ${report.totals.ok} / 失败 ${report.totals.failed}\n`,
  );
  process.stdout.write(
    `关键词命中线索 ${report.totals.newPoolEntries} 条（已收录/在池自动去重 ${report.totals.knownHitsSkipped}），待核验池累计 ${report.totals.poolTotal} 条\n`,
  );
  process.stdout.write(
    `栏目页自动发现：${report.discoveredColumns.length} 个来源共 ${report.totals.discoveredColumns} 条候选栏目页（未自动登记）\n`,
  );
  for (const note of report.notes) process.stdout.write(`  ! ${note}\n`);
  process.stdout.write(`池文件：${POOL_FILE}\n`);
}

await runCollect();
