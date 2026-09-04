import type { Metadata } from "next";
import Link from "next/link";

import { isAdminAuthorized, isAdminConfigured } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "后台管理｜OPC Policy Map",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // 登录页不在此守卫；守卫逻辑由各管理页 server component 执行。
  const configured = isAdminConfigured();
  const authed = configured && (await isAdminAuthorized());

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link href="/admin" className="admin-brand">
          OPC 政策地图 · 后台
        </Link>
        {authed ? (
          <nav className="admin-nav">
            <Link href="/admin/pool">待核验池</Link>
            <Link href="/admin/policies">政策库</Link>
            <Link href="/admin/intel">情报库</Link>
            <form action="/api/admin/logout" method="post" className="admin-logout-form">
              <button type="submit">退出</button>
            </form>
          </nav>
        ) : null}
      </header>
      <main className="admin-main">{children}</main>
      <footer className="admin-footer">
        数据写入遵循 Git 权威源：每次操作生成一次可审计的 commit，随后由 CI 自动同步并发布。
      </footer>
    </div>
  );
}
