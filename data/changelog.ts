import rawChangelog from "./changelog.json";

/** OPC 政策/新闻/情报收录日志（/monitor 页面底部展示）。 */
export interface ChangeEntry {
  date: string;
  summary: string;
  detail?: string;
}

/**
 * 收录日志（薄封装）。
 *
 * 权威数据位于 data/changelog.json（后台管理系统经 GitHub API 读写该文件）；
 * 本文件仅做类型标注与导出，保持既有 `import { CHANGELOG }` 调用点不变。
 */
export const CHANGELOG: ChangeEntry[] = rawChangelog as ChangeEntry[];
