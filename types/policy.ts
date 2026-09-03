export type PolicyCategory =
  | "OPC创业"
  | "算力与模型"
  | "创业服务"
  | "资金与融资"
  | "空间载体"
  | "合规与登记";

export type PolicyLevel = "国家级" | "省级" | "市级" | "区县级";
export type PolicyRelevance = "direct" | "related";
export type PolicyStatus = "现行有效" | "试行" | "规划期内";
export type SourceType = "政策原文" | "政府公报" | "官方发布" | "政策解读";
export type CoverageStatus = "direct" | "related" | "none";

export interface Policy {
  id: string;
  title: string;
  province: string;
  city: string;
  category: PolicyCategory;
  tags: string[];
  publishDate: string;
  effectiveDate?: string;
  expiryDate?: string;
  documentNumber?: string;
  issuedBy: string;
  policyLevel: PolicyLevel;
  relevance: PolicyRelevance;
  status: PolicyStatus;
  summary: string;
  benefits: string[];
  eligibility: string[];
  applicationNotes: string;
  applicationUrl?: string;
  sourceName: string;
  sourceType: SourceType;
  sourceUrl: string;
  verifiedAt: string;
}

export interface ProvinceSummary {
  name: string;
  englishName: string;
  policyCount: number;
  directPolicyCount: number;
  relatedPolicyCount: number;
  coverageStatus: CoverageStatus;
  categoryCounts: Partial<Record<PolicyCategory, number>>;
  lastVerifiedAt: string;
}

export interface PoliciesResponse {
  data: Policy[];
  meta: {
    province: string | null;
    total: number;
    localTotal: number;
    nationalTotal: number;
  };
}
