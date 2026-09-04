import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { listIntel, listPolicies, listPool } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [policies, intel, pool] = await Promise.all([
    listPolicies(),
    listIntel(),
    listPool(),
  ]);

  const cards = [
    {
      href: "/admin/pool",
      title: "待核验池",
      count: pool.entries.length,
      hint: "巡检命中线索，人工核验后转库或驳回",
    },
    {
      href: "/admin/policies",
      title: "政策库",
      count: policies.length,
      hint: "已核验政策文件（参与地图着色）",
    },
    {
      href: "/admin/intel",
      title: "情报库",
      count: intel.length,
      hint: "申报 / 解读 / 落地 / 资源四类情报",
    },
  ];

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">概览</h1>
      <div className="admin-card-grid">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="admin-stat-card">
            <strong>{card.count}</strong>
            <span className="admin-stat-title">{card.title}</span>
            <span className="admin-stat-hint">{card.hint}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
