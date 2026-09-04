/**
 * 已核验条目 sourceUrl 的可回溯性规则（测试与采集通用）：
 * - 优先要求 https；
 * - 少数政府/官方老站仅提供 http，按主机白名单放行。
 * 新增数据若引入新的 http 官方老站，请同步把主机加进名单。
 */
export const HTTP_ONLY_OFFICIAL_HOSTS: readonly string[] = [
  "cetz.changsha.gov.cn",
  "csmls.changsha.gov.cn",
  "tzcjj.gxzf.gov.cn",
  "www.bjchy.gov.cn",
  "www.tj.xinhua.org",
  "gxj.qingdao.gov.cn",
  "www.hebei.gov.cn",
  "bj.people.com.cn",
  "njsj.nanjing.gov.cn",
  "siming.gov.cn",
  "gxq.guiyang.gov.cn",
  "www.qinghai.gov.cn",
  "www.gs.chinanews.com.cn",
  "wglj.changchun.gov.cn",
  "www.uhdz.gov.cn",
  "www.ningbo.gov.cn",
  "hunan.gov.cn",
];

export function isTraceableSourceUrl(url: string): boolean {
  if (url.startsWith("https://")) return true;
  if (url.startsWith("http://")) {
    return HTTP_ONLY_OFFICIAL_HOSTS.some((host) =>
      url.startsWith(`http://${host}/`),
    );
  }
  return false;
}
