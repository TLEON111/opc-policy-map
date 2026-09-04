/**
 * 后台数据服务层（服务端专用）。
 *
 * 遵循「Git 权威源」：读 GitHub 上最新数据文件，内存修改后经 commitFiles 原子提交。
 * 提交后由现有 CI 自动同步 Supabase 并触发部署。
 */
import type { ChangeEntry } from "@/data/changelog";
import type { IntelItem, IntelPoolEntry } from "@/types/intel";
import type { Policy } from "@/types/policy";

import { commitFiles, readJsonFile } from "./github";

export const DATA_PATHS = {
  policies: "data/verified-policies.json",
  intel: "data/verified-intel.json",
  pool: "data/pool/pool.json",
  changelog: "data/changelog.json",
} as const;

// ── 读取 ─────────────────────────────────────────────

export async function listPolicies(): Promise<Policy[]> {
  return (await readJsonFile<Policy[]>(DATA_PATHS.policies)) ?? [];
}

export async function listIntel(): Promise<IntelItem[]> {
  return (await readJsonFile<IntelItem[]>(DATA_PATHS.intel)) ?? [];
}

export interface PoolFile {
  updatedAt?: string;
  entries: IntelPoolEntry[];
}

export async function listPool(): Promise<PoolFile> {
  const data = await readJsonFile<PoolFile>(DATA_PATHS.pool);
  return data ?? { entries: [] };
}

export async function listChangelog(): Promise<ChangeEntry[]> {
  return (await readJsonFile<ChangeEntry[]>(DATA_PATHS.changelog)) ?? [];
}

// ── 写工具 ───────────────────────────────────────────

function writePoliciesFile(policies: Policy[]): string {
  return JSON.stringify(policies, null, 2) + "\n";
}

function writeIntelFile(items: IntelItem[]): string {
  return JSON.stringify(items, null, 2) + "\n";
}

function writePoolFile(pool: PoolFile): string {
  return JSON.stringify(pool, null, 2) + "\n";
}

function writeChangelogFile(entries: ChangeEntry[]): string {
  return JSON.stringify(entries, null, 2) + "\n";
}

// ── 政策库 ───────────────────────────────────────────

/** 新增或替换一条政策（按 id 判断），提交并返回 commit。 */
export async function upsertPolicy(
  policy: Policy,
  message: string,
): Promise<string> {
  const policies = await listPolicies();
  const idx = policies.findIndex((p) => p.id === policy.id);
  if (idx >= 0) policies[idx] = policy;
  else policies.push(policy);
  const { commitSha } = await commitFiles(message, [
    { path: DATA_PATHS.policies, content: writePoliciesFile(policies) },
  ]);
  return commitSha;
}

/** 删除一条政策。 */
export async function deletePolicy(id: string, message: string): Promise<string> {
  const policies = await listPolicies();
  const next = policies.filter((p) => p.id !== id);
  if (next.length === policies.length) throw new Error(`政策不存在：${id}`);
  const { commitSha } = await commitFiles(message, [
    { path: DATA_PATHS.policies, content: writePoliciesFile(next) },
  ]);
  return commitSha;
}

// ── 情报库 ───────────────────────────────────────────

export async function upsertIntel(
  item: IntelItem,
  message: string,
): Promise<string> {
  const items = await listIntel();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  const { commitSha } = await commitFiles(message, [
    { path: DATA_PATHS.intel, content: writeIntelFile(items) },
  ]);
  return commitSha;
}

export async function deleteIntel(id: string, message: string): Promise<string> {
  const items = await listIntel();
  const next = items.filter((i) => i.id !== id);
  if (next.length === items.length) throw new Error(`情报不存在：${id}`);
  const { commitSha } = await commitFiles(message, [
    { path: DATA_PATHS.intel, content: writeIntelFile(next) },
  ]);
  return commitSha;
}

// ── 待核验池 ─────────────────────────────────────────

/** 删除一条池内线索（驳回/丢弃）。 */
export async function removePoolEntry(
  url: string,
  message: string,
): Promise<string> {
  const pool = await listPool();
  const next = pool.entries.filter((e) => e.url !== url);
  if (next.length === pool.entries.length) throw new Error(`池内线索不存在：${url}`);
  const updated: PoolFile = { ...pool, entries: next };
  const { commitSha } = await commitFiles(message, [
    { path: DATA_PATHS.pool, content: writePoolFile(updated) },
  ]);
  return commitSha;
}

/**
 * 核验通过：把一条池内线索转成政策并入库，同时移除池条目并追加 changelog。
 * 三步跨文件原子提交（任一失败整体回滚）。
 */
export async function verifyPoolToPolicy(
  poolUrl: string,
  policy: Policy,
  changelogEntry: ChangeEntry,
  message: string,
): Promise<string> {
  const pool = await listPool();
  const policies = await listPolicies();
  const changelog = await listChangelog();

  if (!pool.entries.some((e) => e.url === poolUrl)) {
    throw new Error(`池内线索不存在：${poolUrl}`);
  }
  if (policies.some((p) => p.id === policy.id)) {
    throw new Error(`政策 id 已存在：${policy.id}`);
  }

  const nextPool: PoolFile = {
    ...pool,
    entries: pool.entries.filter((e) => e.url !== poolUrl),
  };
  const nextPolicies = [...policies, policy];
  const nextChangelog = [changelogEntry, ...changelog];

  const { commitSha } = await commitFiles(message, [
    { path: DATA_PATHS.pool, content: writePoolFile(nextPool) },
    { path: DATA_PATHS.policies, content: writePoliciesFile(nextPolicies) },
    { path: DATA_PATHS.changelog, content: writeChangelogFile(nextChangelog) },
  ]);
  return commitSha;
}

/**
 * 核验通过：把一条池内线索转成四类情报并入库，同时移除池条目并追加 changelog。
 */
export async function verifyPoolToIntel(
  poolUrl: string,
  item: IntelItem,
  changelogEntry: ChangeEntry,
  message: string,
): Promise<string> {
  const pool = await listPool();
  const intel = await listIntel();
  const changelog = await listChangelog();

  if (!pool.entries.some((e) => e.url === poolUrl)) {
    throw new Error(`池内线索不存在：${poolUrl}`);
  }
  if (intel.some((i) => i.id === item.id)) {
    throw new Error(`情报 id 已存在：${item.id}`);
  }

  const nextPool: PoolFile = {
    ...pool,
    entries: pool.entries.filter((e) => e.url !== poolUrl),
  };
  const nextIntel = [...intel, item];
  const nextChangelog = [changelogEntry, ...changelog];

  const { commitSha } = await commitFiles(message, [
    { path: DATA_PATHS.pool, content: writePoolFile(nextPool) },
    { path: DATA_PATHS.intel, content: writeIntelFile(nextIntel) },
    { path: DATA_PATHS.changelog, content: writeChangelogFile(nextChangelog) },
  ]);
  return commitSha;
}
