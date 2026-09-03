import { VERIFIED_POLICIES } from "@/data/verified-policies";
import type { Policy, PolicyCategory, ProvinceSummary } from "@/types/policy";

export const PROVINCE_NAMES: Record<string, string> = {
  北京: "BEIJING",
  天津: "TIANJIN",
  河北: "HEBEI",
  山西: "SHANXI",
  内蒙古: "INNER MONGOLIA",
  辽宁: "LIAONING",
  吉林: "JILIN",
  黑龙江: "HEILONGJIANG",
  上海: "SHANGHAI",
  江苏: "JIANGSU",
  浙江: "ZHEJIANG",
  安徽: "ANHUI",
  福建: "FUJIAN",
  江西: "JIANGXI",
  山东: "SHANDONG",
  河南: "HENAN",
  湖北: "HUBEI",
  湖南: "HUNAN",
  广东: "GUANGDONG",
  广西: "GUANGXI",
  海南: "HAINAN",
  重庆: "CHONGQING",
  四川: "SICHUAN",
  贵州: "GUIZHOU",
  云南: "YUNNAN",
  西藏: "TIBET",
  陕西: "SHAANXI",
  甘肃: "GANSU",
  青海: "QINGHAI",
  宁夏: "NINGXIA",
  新疆: "XINJIANG",
};

function newestFirst(a: Policy, b: Policy) {
  return b.publishDate.localeCompare(a.publishDate);
}

export function getPolicies(filters: { province?: string } = {}): Policy[] {
  const policies = filters.province
    ? VERIFIED_POLICIES.filter((policy) => policy.province === filters.province)
    : VERIFIED_POLICIES;

  return [...policies].sort(newestFirst);
}

export function getPoliciesForProvince(name: string) {
  return {
    localPolicies: getPolicies({ province: name }),
    nationalPolicies: getPolicies({ province: "全国" }),
  };
}

export function getProvinceSummary(name: string): ProvinceSummary {
  const policies = getPolicies({ province: name });
  const directPolicyCount = policies.filter(
    (policy) => policy.relevance === "direct",
  ).length;
  const relatedPolicyCount = policies.length - directPolicyCount;
  const categoryCounts = policies.reduce<
    Partial<Record<PolicyCategory, number>>
  >((counts, policy) => {
    counts[policy.category] = (counts[policy.category] ?? 0) + 1;
    return counts;
  }, {});

  return {
    name,
    englishName: PROVINCE_NAMES[name] ?? name.toUpperCase(),
    policyCount: policies.length,
    directPolicyCount,
    relatedPolicyCount,
    coverageStatus:
      directPolicyCount > 0
        ? "direct"
        : relatedPolicyCount > 0
          ? "related"
          : "none",
    categoryCounts,
    lastVerifiedAt: "2026-09-03",
  };
}

export function getProvinceSummaries(): ProvinceSummary[] {
  return Object.keys(PROVINCE_NAMES).map(getProvinceSummary);
}
