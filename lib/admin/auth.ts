/**
 * 后台认证（/admin）。
 *
 * 方案：单管理员密码 + 签名会话 Cookie（无数据库、无状态）。
 *  - 登录：POST /api/admin/login 校验 ADMIN_PASSWORD，成功签发会话 token；
 *  - 会话 token = base64url(payload).base64url(hmac)，HMAC-SHA256 密钥取自
 *    ADMIN_SESSION_SECRET（未配置时回退 ADMIN_PASSWORD）；
 *  - Cookie：httpOnly、SameSite=Lax、Secure（生产）、7 天有效；
 *  - 校验：requireAdmin（服务端组件，失败 redirect 登录页）与
 *    requireAdminApi（API 路由，失败 401）。
 *
 * 环境变量：
 *  - ADMIN_PASSWORD：登录密码（必填，未配置则后台整体禁用）
 *  - ADMIN_SESSION_SECRET：会话签名密钥（可选，建议配置独立于密码）
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "opc_admin_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 天
const MAX_SKEW_SECONDS = 60;

function adminPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD;
}

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? adminPassword() ?? "";
}

export function isAdminConfigured(): boolean {
  return Boolean(adminPassword());
}

function b64url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64url");
}

function unb64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payload: string): string {
  const secret = sessionSecret();
  const hmac = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${hmac}`;
}

function verify(token: string): boolean {
  const secret = sessionSecret();
  if (!secret) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface SessionPayload {
  exp: number;
}

function parsePayload(token: string): SessionPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  try {
    return JSON.parse(unb64url(token.slice(0, dot))) as SessionPayload;
  } catch {
    return null;
  }
}

/** 签发会话 token（登录成功后调用）。 */
export function issueSessionToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ exp: now + SESSION_TTL_SECONDS }));
  return sign(payload);
}

function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

/** 读取并校验当前会话，返回是否有效。 */
export async function hasValidSession(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  if (!verify(token)) return false;
  const payload = parsePayload(token);
  if (!payload) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now - MAX_SKEW_SECONDS;
}

/** 设置会话 Cookie（登录）。需在 Route Handler 中调用，写入响应头。 */
export function setSessionCookie(response: NextResponseLike): void {
  const token = issueSessionToken();
  response.cookies.set(COOKIE_NAME, token, sessionCookieOptions(process.env.NODE_ENV === "production"));
}

/** 清除会话 Cookie（登出）。 */
export function clearSessionCookie(response: NextResponseLike): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/** 供 Route Handler 使用的响应对象（NextResponse）。 */
export interface NextResponseLike {
  cookies: {
    set(
      name: string,
      value: string,
      options: Record<string, unknown>,
    ): void;
  };
}

/** 服务端组件守卫：未登录则重定向到 /admin/login。 */
export async function requireAdmin(): Promise<void> {
  if (!isAdminConfigured() || !(await hasValidSession())) {
    redirect("/admin/login");
  }
}

/** API 守卫：未登录返回 false（调用方据此返回 401）。 */
export async function isAdminAuthorized(): Promise<boolean> {
  return isAdminConfigured() && (await hasValidSession());
}

/** 校验登录密码；正确返回 true。 */
export function verifyPassword(input: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
