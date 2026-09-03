/** 情报条目的主类别：五类 OPC 相关信息。 */
export type IntelKind =
  | "policy"
  | "application"
  | "interpretation"
  | "news"
  | "resource";

/** 收纳状态：已核验（人工核对过原文） / 待核验（巡检或检索发现的线索）。 */
export type IntelStatus = "verified" | "pending";

/** 置信度：由采集/收录时对来源的判断给出。 */
export type IntelConfidence = "high" | "medium" | "low";

/** 发现途径。 */
export type IntelOrigin = "registry-scan" | "web-research" | "manual";

/** 来源层级。 */
export type IntelSourceLevel = "national" | "province" | "city" | "district";

export const INTEL_KIND_LABELS: Record<IntelKind, string> = {
  policy: "政策文件",
  application: "申报受理",
  interpretation: "解读问答",
  news: "落地动态",
  resource: "资源活动",
};

/** 巡检用的关键词集（大小写不敏感匹配，见 scripts/collect-intel.ts）。 */
export const INTEL_KEYWORDS: readonly string[] = [
  "一人公司",
  "OPC",
  "人工智能一人公司",
  "AI 一人公司",
  "AI一人公司",
  "超级个体",
  "未来星OPC",
  "OPC创业",
  "OPC社区",
  "人工智能OPC",
];

/**
 * 监控来源注册表条目：一个需要定期巡检的官方栏目/站点。
 */
export interface IntelSource {
  id: string;
  /** 地区归属：省名或「全国」。 */
  owner: string;
  /** 站点/栏目显示名。 */
  name: string;
  /** 国家部委 / 省级 / 市级 / 区县级站点。 */
  level: IntelSourceLevel;
  /** 巡检地址（首页或政策列表栏目页）。 */
  url: string;
  /** 说明该地址对应什么栏目、内容特点。 */
  note?: string;
  /** 是否参与巡检。 */
  enabled: boolean;
  /** 最近一次巡检时间（ISO），由巡检器回写，仅内存展示用。 */
  lastCheckedAt?: string;
  /** 最近一次可达性。 */
  reachable?: boolean;
}

/**
 * 已核验/待核验的统一情报条目。
 * policy 类条目同时会在 lib/policies 中维护并参与地图着色；
 * 本类型覆盖其余四类及 policy 类的监测视图展示。
 */
export interface IntelItem {
  id: string;
  kind: IntelKind;
  title: string;
  /** 所属省份（全国条目用「全国」）。 */
  province: string;
  /** 市级或区县粒度（可选）。 */
  city?: string;
  /** 适用区域原文描述，例如「北京市石景山区」。 */
  scopeLabel?: string;
  /** 发布/公告日期 yyyy-mm-dd；无法解析时用 publishDateText 保留原文。 */
  publishDate?: string;
  publishDateText?: string;
  documentNumber?: string;
  issuedBy?: string;
  /** 原文出处显示名。 */
  sourceName: string;
  /** 原文/新闻页完整 URL（收录硬性要求）。 */
  sourceUrl: string;
  /** 来源类型，如 政策原文/官方发布/政府公报/官方转载/新闻稿。 */
  sourceType?: string;
  summary: string;
  /** 分层要点：量化信息（额度/规模/期限），逐条列出。 */
  keyFacts: string[];
  /** 适用对象/条件（可选）。 */
  eligibility?: string[];
  /** 办理或参与提示（可选）。 */
  applicationNotes?: string;
  /** 咨询/受理联系方式原文（可选）。 */
  contactText?: string;
  /** 申报窗口（可选）。 */
  applicationWindow?: {
    start?: string;
    end?: string;
    /** 原文中的窗口描述，如「每季度首月申报」。 */
    text?: string;
  };
  tags: string[];
  /** 发现日期 yyyy-mm-dd。 */
  discoveredAt: string;
  verified: boolean;
  /** 核验日期 yyyy-mm-dd，仅 verified=true 时填写。 */
  verifiedAt?: string;
  confidence: IntelConfidence;
  origin: IntelOrigin;
}

/**
 * 待核验池条目：巡检器发现、尚未人工核验的原始线索。
 * 与 IntelItem 分开建模，避免把未核验内容混入已核验语义。
 */
export interface IntelPoolEntry {
  /** 线索原文 URL（去重键）。 */
  url: string;
  title: string;
  /** 从列表页提取的上下文片段。 */
  snippet?: string;
  /** 命中的来源注册表 id。 */
  sourceId: string;
  /** 命中的关键词。 */
  keyword: string;
  /** 线索归属地区（可从 URL/上下文推断，可空）。 */
  province?: string;
  /** 主类别猜测（可空，供人工快速分流）。 */
  kindGuess?: IntelKind;
  /** 发现时间 ISO。 */
  foundAt: string;
  status: "pending";
}

/** 单次巡检的同步报告。 */
export interface IntelSyncReport {
  checkedAt: string;
  sources: {
    id: string;
    name: string;
    owner: string;
    url: string;
    httpStatus: number | null;
    reachable: boolean;
    error?: string;
    hitCount: number;
  }[];
  totals: {
    sourcesTotal: number;
    ok: number;
    failed: number;
    newPoolEntries: number;
    poolTotal: number;
  };
  notes: string[];
}
