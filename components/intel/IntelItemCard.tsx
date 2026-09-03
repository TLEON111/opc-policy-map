import { ExternalLink } from "lucide-react";

import { IntelKindChip } from "@/components/intel/IntelKindChip";
import type { IntelItem } from "@/types/intel";

/** 情报条目卡片（纯展示，服务端/客户端通用）。 */
export function IntelItemCard({ item }: { item: IntelItem }) {
  return (
    <article className="mon-row">
      <div className="mon-row-top">
        <IntelKindChip kind={item.kind} />
        <h4>
          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
            {item.title}
            <ExternalLink
              aria-hidden="true"
              className="size-3.5 opacity-60"
              strokeWidth={1.8}
            />
          </a>
        </h4>
      </div>
      <p className="mon-meta">
        <span>
          {item.province === "全国"
            ? "全国"
            : `${item.province}${item.city && item.city !== item.province ? ` · ${item.city}` : ""}`}
        </span>
        {item.issuedBy && <span>{item.issuedBy}</span>}
        {item.publishDate && <time dateTime={item.publishDate}>{item.publishDate}</time>}
        {item.documentNumber && <span className="mon-docno">{item.documentNumber}</span>}
      </p>
      {item.keyFacts.length > 0 && (
        <ul className="mon-facts">
          {item.keyFacts.slice(0, 3).map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      )}
      <div className="mon-source">
        <span>{item.summary}</span>
        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
          原文
          <ExternalLink aria-hidden="true" className="size-3" strokeWidth={1.8} />
        </a>
      </div>
    </article>
  );
}
