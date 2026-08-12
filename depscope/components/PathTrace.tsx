import Link from "next/link";
import type { ExposurePathStep } from "@/types";

/**
 * The visual signature of DepScope: an exposure path rendered as a trace,
 * like a wire hopping from pad to pad on a board. This is the same shape
 * as the Cypher pattern that produced it — a chain of nodes connected by
 * one relationship type — made legible to a non-technical reader.
 */
export default function PathTrace({ path }: { path: ExposurePathStep[] }) {
  return (
    <div className="flex items-center flex-wrap gap-1.5 font-mono text-xs">
      {path.map((step, i) => {
        const isVuln = step.type === "vulnerability";
        const isLast = i === path.length - 1;
        return (
          <div key={`${step.name}-${i}`} className="flex items-center gap-1.5">
            <span
              className={`px-2 py-1 rounded-node border ${
                isVuln
                  ? "border-critical/40 bg-critical/10 text-critical"
                  : isLast
                  ? "border-signal/50 bg-signal/10 text-signal"
                  : "border-hairline bg-surface2 text-muted"
              }`}
            >
              {isVuln ? (
                step.name
              ) : (
                <Link
                  href={`/packages/${encodeURIComponent(step.name)}`}
                  className="hover:text-ink transition-colors"
                >
                  {step.name}
                </Link>
              )}
            </span>
            {!isLast && (
              <span className="flex items-center text-faint">
                <span className="trace-dot" />
                <span className="trace-line" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
