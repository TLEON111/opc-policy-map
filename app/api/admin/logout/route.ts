import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(
    new URL("/admin/login", origin),
    302,
  );
  clearSessionCookie(response);
  return response;
}
