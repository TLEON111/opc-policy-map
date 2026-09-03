import { ExternalLink } from "lucide-react";

import { IntelKindChip } from "@/components/intel/IntelKindChip";
import type { ApplicationLead, ApplyStatus } from "@/lib/applications";

const STATUS_STYLE: Record<ApplyStatus, { label: string; className: string }> = {
  open: { label: "进行中", className: "is-open" },
  upcoming: { label: "即将开始", className: "is-upcoming" },
  rolling: { label: "开放中", className: "is-open" },
  past: { label: "已截止", className: "is-past" },
  unknown: { label: "窗口未知", className: "is-unknown" },
};

export function ApplicationLeads({ leads }: { leads: ApplicationLead[] }) {
  if (leads.length === 0) {
    return (
      <div className="mon-empty">
        <strong>当前没有申报/受理类线索</strong>
        <span>巡检或调研发现申报通知后会自动出现在这里。</span>
      </div>
    );
  }

  return (
    <ul className="apply-list">
      {leads.map((lead) => {
        const style = STATUS_STYLE[lead.status];
        return (
          <li key={lead.key} className="apply-card">
            <div className="apply-head">
              <IntelKindChip kind={lead.item.kind} />
              <span className={`apply-status ${style.className}`}>
                {style.label}
              </span>
              <span className="apply-window-label">{lead.statusLabel}</span>
            </div>
            <h4>
              <a
                href={lead.item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {lead.item.title}
                <ExternalLink
                  aria-hidden="true"
                  className="size-3.5 opacity-60"
                  strokeWidth={1.8}
                />
              </a>
            </h4>
            <p className="mon-meta">
              <span>
                {lead.item.province === "全国"
                  ? "全国"
                  : `${lead.item.province}${lead.item.city && lead.item.city !== lead.item.province ? ` · ${lead.item.city}` : ""}`}
              </span>
              {lead.item.issuedBy && <span>{lead.item.issuedBy}</span>}
              {lead.item.publishDate && (
                <time dateTime={lead.item.publishDate}>
                  {lead.item.publishDate}
                </time>
              )}
              {lead.item.documentNumber && (
                <span className="mon-docno">{lead.item.documentNumber}</span>
              )}
            </p>
            <p className="apply-hint">{lead.hint}</p>
          </li>
        );
      })}
    </ul>
  );
}
