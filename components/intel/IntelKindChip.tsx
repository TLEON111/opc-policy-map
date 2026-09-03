import { INTEL_KIND_LABELS, type IntelKind } from "@/types/intel";

const KIND_CHIP: Record<IntelKind, { bg: string; fg: string }> = {
  policy: { bg: "#173c64", fg: "#ffffff" },
  application: { bg: "#0f766e", fg: "#ffffff" },
  interpretation: { bg: "#4338ca", fg: "#ffffff" },
  news: { bg: "#b45309", fg: "#ffffff" },
  resource: { bg: "#7c3aed", fg: "#ffffff" },
};

export function IntelKindChip({ kind }: { kind: IntelKind }) {
  const style = KIND_CHIP[kind];
  return (
    <span className="mon-chip" style={{ background: style.bg, color: style.fg }}>
      {INTEL_KIND_LABELS[kind]}
    </span>
  );
}
