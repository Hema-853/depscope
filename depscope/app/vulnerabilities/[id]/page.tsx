"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SeverityBadge from "@/components/SeverityBadge";
import PathTrace from "@/components/PathTrace";
import { LoadingRows, EmptyState, ErrorState } from "@/components/States";
import type { VulnerabilityExposure } from "@/types";

export default function VulnerabilityPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);

  const [data, setData] = useState<VulnerabilityExposure | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setData(null);
    setError(null);
    setNotFound(false);

    fetch(`/api/vulnerabilities/${encodeURIComponent(id)}/exposure`)
      .then(async (r) => {
        const body = await r.json();
        if (r.status === 404) return setNotFound(true);
        if (body.error) throw new Error(body.message);
        setData(body);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (notFound) {
    return (
      <EmptyState
        title={`No vulnerability with id "${id}".`}
        hint="Head back to the dashboard to browse tracked vulnerabilities."
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        hint="The CognoDB instance may be unreachable — check env vars and instance status."
      />
    );
  }

  if (!data) return <LoadingRows count={6} />;

  const { vulnerability: v, directlyAffected, transitivelyExposed } = data;

  return (
    <div className="space-y-12">
      <div>
        <Link href="/#vulnerabilities" className="font-mono text-xs text-faint hover:text-signal transition-colors">
          ← all vulnerabilities
        </Link>
        <div className="flex items-center gap-3 mt-3">
          <h1 className="text-2xl font-semibold font-mono">{v.id}</h1>
          <SeverityBadge severity={v.severity} />
          <span className="font-mono text-xs text-muted">CVSS {v.cvssScore.toFixed(1)}</span>
        </div>
        <p className="text-muted mt-2 max-w-2xl">{v.summary}</p>
        <p className="text-xs text-faint font-mono mt-2">published {v.publishedAt}</p>
      </div>

      <Section label="Directly affected" detail={`${directlyAffected.length} package${directlyAffected.length !== 1 ? "s" : ""}`}>
        {directlyAffected.length === 0 ? (
          <EmptyState title="No package directly declares this vulnerability." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {directlyAffected.map((p) => (
              <Link
                key={p.name}
                href={`/packages/${encodeURIComponent(p.name)}`}
                className="bg-critical/5 border border-critical/30 rounded-node px-4 py-3 hover:border-critical/50 transition-colors"
              >
                <span className="font-mono text-sm">{p.name}</span>
                <p className="text-xs text-muted truncate">{p.description}</p>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section
        label="Transitively exposed"
        detail={`${transitivelyExposed.length} package${transitivelyExposed.length !== 1 ? "s" : ""} downstream`}
      >
        <p className="text-xs text-faint mb-4 max-w-xl">
          Every package that depends — directly or through a chain of dependencies — on something
          this CVE affects. This is the question a relational join table struggles to answer at
          arbitrary depth.
        </p>
        {transitivelyExposed.length === 0 ? (
          <EmptyState title="No transitive exposure." hint="This vulnerability doesn't propagate beyond the packages that declare it directly." />
        ) : (
          <div className="grid gap-3">
            {transitivelyExposed.map((exp) => (
              <div
                key={exp.path.map((s) => s.name).join(">")}
                className="bg-surface border border-hairline rounded-node px-4 py-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-faint">
                    {exp.hops} hop{exp.hops > 1 ? "s" : ""} from source
                  </span>
                </div>
                <PathTrace path={exp.path} />
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  label,
  detail,
  children,
}: {
  label: string;
  detail?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-mono text-sm text-ink uppercase tracking-wide">{label}</h2>
        {detail && <span className="font-mono text-xs text-faint">{detail}</span>}
      </div>
      {children}
    </section>
  );
}
