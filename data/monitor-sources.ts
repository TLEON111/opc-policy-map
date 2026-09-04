import type { IntelSource } from "@/types/intel";

import rawSources from "./monitor-sources.json";

/**
 * 官方来源注册表（薄封装）。
 *
 * 权威数据位于 data/monitor-sources.json（后台管理系统经 GitHub API 读写该文件）；
 * 本文件仅做类型标注与导出，保持既有 `import { MONITOR_SOURCES }` 调用点不变。
 */
export const MONITOR_SOURCES: IntelSource[] = rawSources as IntelSource[];

/** 注册表便捷查询。 */
export function getMonitorSources(): IntelSource[] {
  return MONITOR_SOURCES;
}
