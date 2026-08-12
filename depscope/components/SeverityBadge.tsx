import type { Severity } from "@/types";

const STYLES: Record<Severity, string> = {
  critical: "text-critical border-critical/40 bg-critical/10",
  high: "text-critical border-critical/30 bg-critical/5",
  medium: "text-warning border-warning/40 bg-warning/10",
  low: "text-low border-low/40 bg-low/10",
};

export default function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-node border font-mono text-[11px] uppercase tracking-wide ${STYLES[severity]}`}
    >
      {severity}
    </span>
  );
}
