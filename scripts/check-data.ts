/**
 * 已核验数据质量校验（Node ≥ 22 直接运行，erasable-only TypeScript）。
 *
 * 校验对象：
 *  - data/verified-policies.ts（政策文件，地图/面板主体）
 *  - data/verified-intel.ts（四类跟进情报）
 *  - data/pool/pool.json（待核验池）
 *
 * 规则：id/URL 唯一、可回溯（https 或官方 http 白名单）、必填字段、
 * 省份合法、日期格式、kind/category 合法、池条目状态。
 * 运行：npm run check:data （无网络；不修改任何文件）
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { isTraceableSourceUrl } from "../lib/url-policy.ts";
import type { IntelItem } from "../types/intel.ts";
import type { Policy } from "../types/policy.ts";

const VERIFIED_POLICIES = JSON.parse(
  readFileSync(join(process.cwd(), "data", "verified-policies.json"), "utf8"),
) as Policy[];

const VERIFIED_INTEL = JSON.parse(
  readFileSync(join(process.cwd(), "data", "verified-intel.json"), "utf8"),
) as IntelItem[];

/** 31 个大陆省级地区（与 lib/policies.ts 的 PROVINCE_NAMES 保持同步）。 */
const PROVINCE_SET = new Set([
  "北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江",
  "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东",
  "河南", "湖北", "湖南", "广东", "广西", "海南",
  "重庆", "四川", "贵州", "云南", "西藏",
  "陕西", "甘肃", "青海", "宁夏", "新疆",
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RECENT_VERIFY_DATES = new Set(["2026-09-03", "2026-09-04"]);
const KINDS = new Set(["policy", "application", "interpretation", "news", "resource"]);
const errors: string[] = [];
const warnings: string[] = [];

function error(message: string) {
  errors.push(message);
}

function checkDate(value: string | undefined, label: string) {
  if (value !== undefined && !DATE_RE.test(value)) {
    error(`${label} 日期格式非法：${value}`);
  }
}

function checkProvince(province: string, label: string) {
  if (province !== "全国" && !PROVINCE_SET.has(province)) {
    error(`${label} 省份不在 31 省清单内：${province}`);
  }
}

// ── 政策文件 ─────────────────────────────────────────
{
  const ids = new Set<string>();
  const urls = new Set<string>();
  for (const policy of VERIFIED_POLICIES) {
    if (ids.has(policy.id)) error(`verified-policies 重复 id：${policy.id}`);
    ids.add(policy.id);
    if (urls.has(policy.sourceUrl)) {
      error(`verified-policies 重复 sourceUrl：${policy.sourceUrl}`);
    }
    urls.add(policy.sourceUrl);
    if (!isTraceableSourceUrl(policy.sourceUrl)) {
      error(`verified-policies 不可回溯 URL：${policy.sourceUrl}`);
    }
    if (!RECENT_VERIFY_DATES.has(policy.verifiedAt)) {
      error(`verified-policies 核验日期异常：${policy.id} → ${policy.verifiedAt}`);
    }
    if (!policy.title || !policy.sourceName || !policy.summary) {
      error(`verified-policies 必填字段缺失：${policy.id}`);
    }
    if (!Array.isArray(policy.benefits) || policy.benefits.length === 0) {
      error(`verified-policies benefits 为空：${policy.id}`);
    }
    if (!Array.isArray(policy.eligibility) || policy.eligibility.length === 0) {
      error(`verified-policies eligibility 为空：${policy.id}`);
    }
    checkDate(policy.publishDate, `${policy.id} publishDate`);
    checkDate(policy.effectiveDate, `${policy.id} effectiveDate`);
    checkDate(policy.expiryDate, `${policy.id} expiryDate`);
    checkProvince(policy.province, `${policy.id} province`);
  }
  warnings.push(`verified-policies：${VERIFIED_POLICIES.length} 条`);
}

// ── 情报条目 ──────────────────────────────────────────
{
  const ids = new Set<string>();
  const urls = new Set<string>();
  for (const item of VERIFIED_INTEL) {
    if (ids.has(item.id)) error(`verified-intel 重复 id：${item.id}`);
    ids.add(item.id);
    if (urls.has(item.sourceUrl)) {
      error(`verified-intel 重复 sourceUrl：${item.sourceUrl}`);
    }
    urls.add(item.sourceUrl);
    if (!KINDS.has(item.kind)) error(`verified-intel 非法 kind：${item.id} → ${item.kind}`);
    if (!isTraceableSourceUrl(item.sourceUrl)) {
      error(`verified-intel 不可回溯 URL：${item.sourceUrl}`);
    }
    if (item.verified) {
      if (!RECENT_VERIFY_DATES.has(item.verifiedAt ?? "")) {
        error(`verified-intel 已核验条目核验日期异常：${item.id}`);
      }
    }
    if (!item.title || !item.sourceName || !item.summary) {
      error(`verified-intel 必填字段缺失：${item.id}`);
    }
    if (!Array.isArray(item.keyFacts)) {
      error(`verified-intel keyFacts 非数组：${item.id}`);
    }
    if (!Array.isArray(item.tags) || item.tags.length === 0) {
      error(`verified-intel tags 为空：${item.id}`);
    }
    checkDate(item.publishDate, `${item.id} publishDate`);
    checkProvince(item.province, `${item.id} province`);
    if (item.applicationWindow) {
      checkDate(item.applicationWindow.start, `${item.id} window.start`);
      checkDate(item.applicationWindow.end, `${item.id} window.end`);
    }
    if (!item.publishDate) {
      warnings.push(`verified-intel 无发布日（排序垫底）：${item.id}`);
    }
  }
  warnings.push(`verified-intel：${VERIFIED_INTEL.length} 条`);
}

// ── 待核验池 ──────────────────────────────────────────
{
  const poolPath = join(process.cwd(), "data", "pool", "pool.json");
  try {
    const raw = readFileSync(poolPath, "utf8");
    const pool = (JSON.parse(raw) as { entries?: Array<{ url: string; status: string }> }).entries ?? [];
    const urls = new Set<string>();
    for (const entry of pool) {
      if (!entry.url.startsWith("http")) error(`pool 条目 URL 非法：${entry.url}`);
      if (urls.has(entry.url)) error(`pool 重复 URL：${entry.url}`);
      urls.add(entry.url);
      if (entry.status !== "pending") error(`pool 条目状态非法：${entry.status}`);
    }
    warnings.push(`pool：${pool.length} 条`);
  } catch {
    error("pool.json 不存在或损坏");
  }
}

process.stdout.write("OPC 数据质量校验\n");
for (const warning of warnings) process.stdout.write(`  ~ ${warning}\n`);
if (errors.length > 0) {
  for (const message of errors) process.stdout.write(`  ✗ ${message}\n`);
  process.stdout.write(`校验失败：${errors.length} 个错误\n`);
  process.exit(1);
}
process.stdout.write("校验通过：0 个错误\n");
