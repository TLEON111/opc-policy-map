import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Policy } from "@/types/policy";

function relevanceLabel(policy: Policy) {
  if (policy.province === "全国") return "全国通用";
  return policy.relevance === "direct" ? "直接 OPC" : "相关支撑";
}

export function PolicyCard({ policy }: { policy: Policy }) {
  return (
    <article className="policy-card">
      <div className="policy-card-meta">
        <Badge
          className={
            policy.relevance === "direct"
              ? "bg-[#e8f1fb] text-[#174f80]"
              : "bg-[#eef2f5] text-[#526476]"
          }
        >
          {relevanceLabel(policy)}
        </Badge>
        <Badge>{policy.policyLevel}</Badge>
        <Badge className="bg-emerald-50 text-emerald-700">{policy.status}</Badge>
        <time className="ml-auto text-xs text-slate-500" dateTime={policy.publishDate}>
          {policy.publishDate}
        </time>
      </div>

      <h3>{policy.title}</h3>
      <div className="document-meta">
        <span>{policy.issuedBy}</span>
        {policy.documentNumber && <span>{policy.documentNumber}</span>}
      </div>
      <p className="policy-summary">{policy.summary}</p>

      <div className="policy-highlight">
        <p>核心支持</p>
        <ul>
          {policy.benefits.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
      </div>

      <details className="policy-details">
        <summary>查看适用条件与办理提示</summary>
        <div className="detail-block">
          <h4>适用对象 / 条件</h4>
          <ul>
            {policy.eligibility.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="detail-block">
          <h4>办理提示</h4>
          <p>{policy.applicationNotes}</p>
        </div>
        <dl className="date-grid">
          {policy.effectiveDate && (
            <div>
              <dt>实施日期</dt>
              <dd>{policy.effectiveDate}</dd>
            </div>
          )}
          {policy.expiryDate && (
            <div>
              <dt>到期日期</dt>
              <dd>{policy.expiryDate}</dd>
            </div>
          )}
        </dl>
        {policy.applicationUrl && (
          <a
            className="application-link"
            href={policy.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            前往办理 / 专题入口
            <ExternalLink aria-hidden="true" className="size-4" strokeWidth={1.6} />
          </a>
        )}
      </details>

      <div className="policy-source">
        <p>
          {policy.sourceType}：<span>{policy.sourceName}</span>
          <small>核验于 {policy.verifiedAt}</small>
        </p>
        <a
          className="source-link"
          href={policy.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          查看官方原文
          <ExternalLink aria-hidden="true" className="size-4" strokeWidth={1.6} />
        </a>
      </div>
    </article>
  );
}
