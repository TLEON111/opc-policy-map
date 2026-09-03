import { getVerifiedIntel } from "@/lib/intel";
import type { IntelItem } from "@/types/intel";

/**
 * 申报/受理提醒层（纯函数、服务端/测试使用）。
 *
 * 不做任何截止日期推断：只有原文/字段明确给出 applicationWindow 时才使用；
 * 否则一律归为「窗口以原文为准」，宁缺毋假。
 */

/** 申报动作强信号词（标题级）。 */
const APPLY_TITLE_RE =
  /申报|报名|征集|申领|受理|组织申报|招引|揭榜|选拔/;

/** 世界时间基准（与项目数据口径一致，2026-09-03）。 */
export const NOW_DATE = "2026-09-03";

export type ApplyStatus = "open" | "upcoming" | "past" | "rolling" | "unknown";

export interface ApplicationLead {
  key: string;
  item: IntelItem;
  /** 申报窗口：仅在数据有明确 start/end 时才有。 */
  window?: { start?: string; end?: string; text?: string };
  status: ApplyStatus;
  statusLabel: string;
  /** 用户可行动的提示文本（来自数据本身）。 */
  hint: string;
}

function compareDates(a: string, b: string): number {
  return a.localeCompare(b);
}

function classifyLead(window?: {
  start?: string;
  end?: string;
  text?: string;
}): { status: ApplyStatus; label: string } {
  if (!window || (!window.start && !window.end)) {
    return {
      status: window?.text ? "rolling" : "unknown",
      label: window?.text ? "开放中 · 窗口以原文为准" : "窗口以原文为准",
    };
  }
  if (window.end && compareDates(window.end, NOW_DATE) < 0) {
    return { status: "past", label: `已于 ${window.end} 截止` };
  }
  if (window.start && compareDates(window.start, NOW_DATE) > 0) {
    return {
      status: "upcoming",
      label: `将于 ${window.start} 开始${window.end ? `（至 ${window.end}）` : ""}`,
    };
  }
  const range = [window.start, window.end].filter(Boolean).join(" 至 ");
  return {
    status: "open",
    label: `开放中${range ? ` · ${range}` : ""}`,
  };
}

function hintFor(item: IntelItem): string {
  if (item.applicationNotes) return item.applicationNotes;
  const notes = [
    item.applicationWindow?.text,
    item.keyFacts.join(" "),
    item.summary,
  ]
    .filter(Boolean)
    .join(" ");
  return notes.slice(0, 160) || "请查看官方原文获取申报条件与入口。";
}

/** 计算申报线索：application 类情报 + 标题命中申报动作词的条目。 */
export function getApplicationLeads(): ApplicationLead[] {
  const leads: ApplicationLead[] = [];
  for (const item of getVerifiedIntel()) {
    if (item.kind !== "application" && !APPLY_TITLE_RE.test(item.title)) {
      continue;
    }
    const { status, label } = classifyLead(item.applicationWindow);
    leads.push({
      key: item.id,
      item,
      window: item.applicationWindow,
      status,
      statusLabel: label,
      hint: hintFor(item),
    });
  }
  // 进行中/即将开始优先，再按发布时间倒序。
  const priority: Record<ApplyStatus, number> = {
    open: 0,
    upcoming: 1,
    rolling: 2,
    past: 3,
    unknown: 4,
  };
  return leads.sort(
    (a, b) =>
      priority[a.status] - priority[b.status] ||
      (b.item.publishDate ?? "0000-00-00").localeCompare(
        a.item.publishDate ?? "0000-00-00",
      ),
  );
}
