import type { Policy } from "@/types/policy";

import rawPolicies from "./verified-policies.json";

/**
 * 已核验政策库（薄封装）。
 *
 * 权威数据位于 data/verified-policies.json（后台管理系统经 GitHub API 读写该文件）；
 * 本文件仅做类型标注与导出，保持既有 `import { VERIFIED_POLICIES }` 调用点不变。
 */
export const VERIFIED_POLICIES: Policy[] = rawPolicies as Policy[];
