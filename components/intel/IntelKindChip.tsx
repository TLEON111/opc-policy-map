import { INTEL_KIND_LABELS, type IntelKind } from "@/types/intel";

const KIND_CHIP: Record<IntelKind, { bg: string; fg: string }> = {
  policy: { bg: "#e9f3ff", fg: "#086beb" },
  application: { bg: "#eaf8f1", fg: "#159a62" },
  interpretation: { bg: "#fff2e7", fg: "#d97820" },
  news: { bg: "#f2edff", fg: "#7553c8" },
  resource: { bg: "#e8f8f5", fg: "#168b7a" },
};

export function IntelKindChip({ kind }: { kind: IntelKind }) {
  const style = KIND_CHIP[kind];
  return (
    <span className="mon-chip" style={{ background: style.bg, color: style.fg }}>
      {INTEL_KIND_LABELS[kind]}
    </span>
  );
}
