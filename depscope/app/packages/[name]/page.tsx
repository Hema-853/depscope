"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SeverityBadge from "@/components/SeverityBadge";
import PathTrace from "@/components/PathTrace";
import { LoadingRows, EmptyState, ErrorState } from "@/components/States";
import type { PackageExposure, Severity } from "@/types";

interface PackageDetail {
  package: { name: string; ecosystem: string; description: string; latestVersion: string };
  dependencies: { name: string; versionRange: string; kind: string }[];
  dependents: { name: string; versionRange: string; kind: string }[];
  maintainers: { username: string; name: string }[];
  directVulnerabilities: { id: string; severity: Severity; cvssScore: number; summary: string }[];
}

export default function PackagePage() {
  const params = useParams<{ name: string }>();
  const name = decodeURIComponent(params.name);

  const [detail, setDetail] = useState<PackageDetail | null>(null);
  const [exposure, setExposure] = useState<PackageExposure | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setDetail(null);
    setExposure(null);
    setError(null);
    setNotFound(false);

    fetch(`/api/packages/${encodeURIComponent(name)}`)
      .then(async (r) => {
        const body = await r.json();
        if (r.status === 404) return setNotFound(true);
        if (body.error) throw new Error(body.message);
        setDetail(body);
      })
      .catch((e) => setError(e.message));

    fetch(`/api/packages/${encodeURIComponent(name)}/exposure`)
      .then((r) => r.json())
      .then((body) => {
        if (!body.error) setExposure(body);
      });
  }, [name]);

  if (notFound) {
    return (
      <EmptyState
        title={`No package named "${name}".`}
        hint="Check the spelling, or head back to browse the graph."
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

  if (!detail) return <LoadingRows count={6} />;

  const { package: pkg, dependencies, dependents, maintainers, directVulnerabilities } = detail;
  const transitive = exposure?.vulnerabilities.filter((v) => v.hops > 0) ?? [];

  return (
    <div className="space-y-12">
      <div>
        <Link href="/" className="font-mono text-xs text-faint hover:text-signal transition-colors">
          ← all packages
        </Link>
        <div className="flex items-center gap-3 mt-3">
          <h1 className="text-2xl font-semibold font-mono">{pkg.name}</h1>
          <span className="font-mono text-xs text-faint border border-hairline rounded-node px-2 py-0.5">
            {pkg.ecosystem}
          </span>
          <span className="font-mono text-xs text-muted">v{pkg.latestVersion}</span>
        </div>
        <p className="text-muted mt-2 max-w-2xl">{pkg.description}</p>
        {maintainers.length > 0 && (
          <p className="text-xs text-faint font-mono mt-3">
            maintained by {maintainers.map((m) => m.name || m.username).join(", ")}
          </p>
        )}
      </div>

      {directVulnerabilities.length > 0 && (
        <Section label="Directly affects this package">
          <div className="grid gap-2">
            {directVulnerabilities.map((v) => (
              <Link
                key={v.id}
                href={`/vulnerabilities/${encodeURIComponent(v.id)}`}
                className="flex items-center gap-3 bg-critical/5 border border-critical/30 rounded-node px-4 py-3 hover:border-critical/50 transition-colors"
              >
                <SeverityBadge severity={v.severity} />
                <span className="font-mono text-sm">{v.id}</span>
                <span className="text-xs text-muted truncate">{v.summary}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section
        label="Transitive vulnerability exposure"
        detail={
          exposure
            ? `${transitive.length} via dependencies`
            : undefined
        }
      >
        {!exposure ? (
          <LoadingRows count={2} />
        ) : transitive.length === 0 ? (
          <EmptyState title="No transitive exposure found." hint="Nothing this package depends on is currently flagged." />
        ) : (
          <div className="grid gap-3">
            {transitive.map((v) => (
              <div key={v.vulnerability.id} className="bg-surface border border-hairline rounded-node px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <SeverityBadge severity={v.vulnerability.severity} />
                  <span className="font-mono text-xs text-faint">{v.hops} hop{v.hops > 1 ? "s" : ""} away</span>
                </div>
                <PathTrace path={v.path} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="grid md:grid-cols-2 gap-10">
        <Section label="Depends on" detail={`${dependencies.length} direct`}>
          {dependencies.length === 0 ? (
            <EmptyState title="No dependencies." />
          ) : (
            <ul className="space-y-1.5">
              {dependencies.map((d) => (
                <li key={d.name}>
                  <Link
                    href={`/packages/${encodeURIComponent(d.name)}`}
                    className="flex items-center justify-between font-mono text-sm bg-surface border border-hairline rounded-node px-3 py-2 hover:border-signal/40 transition-colors"
                  >
                    <span>{d.name}</span>
                    <span className="text-faint text-xs">{d.versionRange}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section label="Depended on by" detail={`${dependents.length} direct`}>
          {dependents.length === 0 ? (
            <EmptyState title="Nothing depends on this — a leaf package." />
          ) : (
            <ul className="space-y-1.5">
              {dependents.map((d) => (
                <li key={d.name}>
                  <Link
                    href={`/packages/${encodeURIComponent(d.name)}`}
                    className="flex items-center justify-between font-mono text-sm bg-surface border border-hairline rounded-node px-3 py-2 hover:border-signal/40 transition-colors"
                  >
                    <span>{d.name}</span>
                    <span className="text-faint text-xs">{d.versionRange}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
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
