import { NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/admin/auth";
import {
  removePoolEntry,
  verifyPoolToIntel,
  verifyPoolToPolicy,
} from "@/lib/admin/data";
import { auditMessage } from "@/lib/admin/github";
import type { ChangeEntry } from "@/data/changelog";
import type { IntelItem } from "@/types/intel";
import type { Policy } from "@/types/policy";

export const dynamic = "force-dynamic";

/** 驳回/丢弃一条池内线索。 */
export async function DELETE(request: Request): Promise<Response> {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.trim();
  if (!url) {
    return NextResponse.json({ error: "缺少 url" }, { status: 400 });
  }

  try {
    const commitSha = await removePoolEntry(url, auditMessage("驳回待核验线索"));
    return NextResponse.json({ ok: true, commitSha });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "驳回失败" },
      { status: 500 },
    );
  }
}

interface VerifyBody {
  poolUrl: string;
  target: "policy" | "intel";
  policy?: Policy;
  intel?: IntelItem;
  changelog: ChangeEntry;
}

/** 核验通过：转政策或转情报，同时移除池条目 + 追加 changelog。 */
export async function POST(request: Request): Promise<Response> {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  if (!body.poolUrl || !body.changelog) {
    return NextResponse.json(
      { error: "缺少 poolUrl / changelog" },
      { status: 400 },
    );
  }

  try {
    if (body.target === "policy") {
      if (!body.policy) {
        return NextResponse.json({ error: "转政策需提供 policy" }, { status: 400 });
      }
      const commitSha = await verifyPoolToPolicy(
        body.poolUrl,
        body.policy,
        body.changelog,
        auditMessage(`核验通过转政策：${body.policy.title}`),
      );
      return NextResponse.json({ ok: true, commitSha });
    }

    if (body.target === "intel") {
      if (!body.intel) {
        return NextResponse.json({ error: "转情报需提供 intel" }, { status: 400 });
      }
      const commitSha = await verifyPoolToIntel(
        body.poolUrl,
        body.intel,
        body.changelog,
        auditMessage(`核验通过转情报：${body.intel.title}`),
      );
      return NextResponse.json({ ok: true, commitSha });
    }

    return NextResponse.json(
      { error: `未知 target：${body.target}` },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "核验失败" },
      { status: 500 },
    );
  }
}
