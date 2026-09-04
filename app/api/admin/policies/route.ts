import { NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/admin/auth";
import { deletePolicy, upsertPolicy } from "@/lib/admin/data";
import { auditMessage } from "@/lib/admin/github";
import type { Policy } from "@/types/policy";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let policy: Policy;
  try {
    policy = (await request.json()) as Policy;
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  if (!policy.id || !policy.title || !policy.province || !policy.sourceUrl) {
    return NextResponse.json(
      { error: "缺少必填字段：id / title / province / sourceUrl" },
      { status: 400 },
    );
  }

  try {
    const action = policy.id ? "更新政策" : "新增政策";
    const commitSha = await upsertPolicy(
      policy,
      auditMessage(`${action}：${policy.title}`),
    );
    return NextResponse.json({ ok: true, commitSha });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  }

  try {
    const commitSha = await deletePolicy(id, auditMessage(`删除政策：${id}`));
    return NextResponse.json({ ok: true, commitSha });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 },
    );
  }
}
