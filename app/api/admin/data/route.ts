import { NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/admin/auth";
import {
  listChangelog,
  listIntel,
  listPolicies,
  listPool,
} from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") ?? "policies";

  try {
    switch (kind) {
      case "policies":
        return NextResponse.json({ data: await listPolicies() });
      case "intel":
        return NextResponse.json({ data: await listIntel() });
      case "pool":
        return NextResponse.json({ data: await listPool() });
      case "changelog":
        return NextResponse.json({ data: await listChangelog() });
      default:
        return NextResponse.json({ error: `未知 kind：${kind}` }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取失败" },
      { status: 500 },
    );
  }
}
