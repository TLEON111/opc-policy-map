import { NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/admin/auth";
import { deleteIntel, upsertIntel } from "@/lib/admin/data";
import { auditMessage } from "@/lib/admin/github";
import type { IntelItem } from "@/types/intel";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let item: IntelItem;
  try {
    item = (await request.json()) as IntelItem;
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  if (!item.id || !item.title || !item.province || !item.sourceUrl || !item.kind) {
    return NextResponse.json(
      { error: "缺少必填字段：id / title / province / sourceUrl / kind" },
      { status: 400 },
    );
  }

  try {
    const action = "更新情报";
    const commitSha = await upsertIntel(
      item,
      auditMessage(`${action}：${item.title}`),
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
    const commitSha = await deleteIntel(id, auditMessage(`删除情报：${id}`));
    return NextResponse.json({ ok: true, commitSha });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 },
    );
  }
}
