import { NextResponse } from "next/server";

import {
  clearSessionCookie,
  isAdminConfigured,
  setSessionCookie,
  verifyPassword,
} from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "后台未配置（缺少 ADMIN_PASSWORD）" },
      { status: 503 },
    );
  }

  let password: string;
  try {
    const body = (await request.json()) as { password?: string };
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  if (!verifyPassword(password)) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  setSessionCookie(response);
  return response;
}
