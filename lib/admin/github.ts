/**
 * GitHub 数据访问层（后台 /admin 专用）。
 *
 * 后台遵循「Git 权威源」架构：所有读写都经 GitHub REST API 落库，
 * 提交后由现有 CI（sync-supabase.yml / Netlify 部署）自动同步与发布。
 *
 * 能力：
 *  - readFile：读取单个文件的原始内容 + 最新 blob sha（乐观并发锁）；
 *  - commitFiles：一次原子提交多个文件（增/改/删），基于 git-data API
 *    （blob → tree → commit → ref），保证「池转库」等跨文件操作要么全部成功。
 *
 * 环境变量：
 *  - GITHUB_REPO：仓库 owner/name，默认 TLEON111/opc-policy-map
 *  - GITHUB_ADMIN_TOKEN：写权限 PAT（contents scope），仅服务端使用
 */
import { createHmac } from "node:crypto";

const DEFAULT_REPO = "TLEON111/opc-policy-map";
const API_BASE = "https://api.github.com";
const BRANCH = "main";

function repo(): string {
  return process.env.GITHUB_REPO?.replace(/\/$/, "") || DEFAULT_REPO;
}

function token(): string | undefined {
  return process.env.GITHUB_ADMIN_TOKEN;
}

function headers(): Record<string, string> {
  const t = token();
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "opc-policy-map-admin",
  };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

class GithubError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function ghFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new GithubError(
      response.status,
      `GitHub API ${path} 失败（HTTP ${response.status}）：${text.slice(0, 300)}`,
    );
  }
  return (await response.json()) as T;
}

export interface ReadFileResult {
  /** 原始文本内容（UTF-8 解码后）。 */
  content: string;
  /** 当前 blob sha（用于乐观并发，提交时回传）。 */
  sha: string;
}

/** 读取仓库内文件原始内容。文件不存在返回 null。 */
export async function readFile(path: string): Promise<ReadFileResult | null> {
  try {
    const data = await ghFetch<{ content?: string; sha: string }>(
      `/repos/${repo()}/contents/${path}`,
    );
    if (typeof data.content !== "string") return null;
    return {
      content: Buffer.from(data.content, "base64").toString("utf8"),
      sha: data.sha,
    };
  } catch (error) {
    if (error instanceof GithubError && error.status === 404) return null;
    throw error;
  }
}

export interface FileChange {
  /** 仓库内相对路径，如 data/verified-policies.json。 */
  path: string;
  /** 新内容（UTF-8）；删除时置 undefined。 */
  content?: string;
}

interface RefResponse {
  object: { sha: string };
}

interface CommitResponse {
  sha: string;
  tree: { sha: string };
}

interface BlobResponse {
  sha: string;
}

interface TreeResponse {
  sha: string;
}

interface NewCommitResponse {
  sha: string;
}

interface RefUpdateResponse {
  object: { sha: string };
}

/**
 * 一次原子提交多个文件变更。
 * @param message 提交说明（会成为 commit message）。
 * @param changes 文件变更集（至少一项）。
 */
export async function commitFiles(
  message: string,
  changes: FileChange[],
): Promise<{ commitSha: string }> {
  if (changes.length === 0) {
    throw new Error("commitFiles 需要至少一个文件变更");
  }

  // 1) 当前分支 HEAD
  const ref = await ghFetch<RefResponse>(
    `/repos/${repo()}/git/ref/heads/${BRANCH}`,
  );

  // 2) 当前 HEAD 的 tree sha
  const headCommit = await ghFetch<CommitResponse>(
    `/repos/${repo()}/git/commits/${ref.object.sha}`,
  );

  // 3) 为每个文件创建 blob
  const treeEntries = [];
  for (const change of changes) {
    if (change.content === undefined) {
      // 删除：tree 中 sha 为 null
      treeEntries.push({ path: change.path, mode: "100644", type: "blob", sha: null });
    } else {
      const blob = await ghFetch<BlobResponse>(`/repos/${repo()}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({
          content: change.content,
          encoding: "utf-8",
        }),
      });
      treeEntries.push({
        path: change.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      });
    }
  }

  // 4) 基于当前 tree 创建新 tree
  const tree = await ghFetch<TreeResponse>(`/repos/${repo()}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: headCommit.tree.sha,
      tree: treeEntries,
    }),
  });

  // 5) 创建 commit
  const commit = await ghFetch<NewCommitResponse>(
    `/repos/${repo()}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: [headCommit.sha],
      }),
    },
  );

  // 6) 更新分支引用
  await ghFetch<RefUpdateResponse>(`/repos/${repo()}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });

  return { commitSha: commit.sha };
}

/** 读取 JSON 文件并解析；不存在/损坏返回 null。 */
export async function readJsonFile<T>(path: string): Promise<T | null> {
  const file = await readFile(path);
  if (!file) return null;
  try {
    return JSON.parse(file.content) as T;
  } catch {
    return null;
  }
}

/** 提交时附带操作者标识（用于审计）。 */
export function auditMessage(action: string): string {
  const prefix = "admin";
  const date = new Date().toISOString().slice(0, 10);
  return `${action}（后台 · ${prefix} · ${date}）`;
}

/** 生成随机 id（用于新条目）。 */
export function generateId(prefix: string): string {
  const random = createHmac("sha256", String(Date.now()))
    .update(`${prefix}-${Math.random()}`)
    .digest("hex")
    .slice(0, 8);
  return `${prefix}-${random}`;
}
