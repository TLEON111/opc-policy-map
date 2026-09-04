const BLOCKED_CANDIDATE_HOSTS = new Set(["mp.weixin.qq.com"]);

function isGovCnHost(hostname: string): boolean {
  return hostname === "gov.cn" || hostname.endsWith(".gov.cn");
}

/** 归一化候选 URL，避免路径双斜杠导致已核验/在池去重失效。 */
export function normalizeIntelCandidateUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/");
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * 判断巡检命中的候选 URL 是否适合进入待核验池。
 * 自动入池只接受官方域名：来源同站，或中国政府域名 .gov.cn。
 */
export function shouldQueueIntelCandidateUrl(
  sourceUrl: string,
  candidateUrl: string,
): boolean {
  try {
    const source = new URL(sourceUrl);
    const normalized = normalizeIntelCandidateUrl(candidateUrl);
    if (!normalized) return false;
    const candidate = new URL(normalized);
    if (!/^https?:$/.test(candidate.protocol)) return false;
    if (BLOCKED_CANDIDATE_HOSTS.has(candidate.hostname)) return false;
    return candidate.hostname === source.hostname || isGovCnHost(candidate.hostname);
  } catch {
    return false;
  }
}
