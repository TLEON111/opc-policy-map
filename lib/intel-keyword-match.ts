const STRONG_KEYWORDS = [
  "人工智能OPC",
  "人工智能一人公司",
  "AI 一人公司",
  "AI一人公司",
  "未来星OPC",
  "OPC创业",
  "OPC社区",
  "一人公司",
  "OPC",
] as const;

const SUPER_INDIVIDUAL_CONTEXT = [
  "AI",
  "人工智能",
  "创业",
  "公司",
  "社区",
  "智能体",
] as const;

/**
 * 巡检标题关键词匹配。
 *
 * “OPC/一人公司”属于强信号，直接命中；“超级个体”单独出现时泛化过强，
 * 必须同时带 AI/人工智能/创业/公司/社区/智能体语境，降低误入池概率。
 */
export function getIntelKeywordHits(text: string): string[] {
  const upper = text.toUpperCase();
  const hits: string[] = STRONG_KEYWORDS.filter((keyword) =>
    upper.includes(keyword.toUpperCase()),
  );

  if (
    text.includes("超级个体") &&
    SUPER_INDIVIDUAL_CONTEXT.some((keyword) => upper.includes(keyword.toUpperCase()))
  ) {
    hits.push("超级个体+AI/创业/社区");
  }

  return [...new Set(hits)];
}
