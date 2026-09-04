import type { IntelItem } from "@/types/intel";

import rawIntel from "./verified-intel.json";

/**
 * 已核验四类跟进情报库（薄封装）。
 *
 * 权威数据位于 data/verified-intel.json（后台管理系统经 GitHub API 读写该文件）；
 * 本文件仅做类型标注与导出，保持既有 `import { VERIFIED_INTEL }` 调用点不变。
 */
export const VERIFIED_INTEL: IntelItem[] = rawIntel as IntelItem[];
