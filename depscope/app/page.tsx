"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SeverityBadge from "@/components/SeverityBadge";
import { LoadingRows, EmptyState, ErrorState } from "@/components/States";
import type { PackageWithStats, VulnerabilityNode, Severity } from "@/types";

type Vuln = VulnerabilityNode & { affectedCount: number };

export default function Dashboard() {
  const [packages, setPackages] = useState<PackageWithStats[] | null>(null);
  const [vulns, setVulns] = useState<Vuln[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    PackageWithStats[] | null
  >(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/packages").then((r) => r.json()),
      fetch("/api/vulnerabilities").then((r) => r.json()),
    ])
      .then(([pkgRes, vulnRes]) => {
        if (pkgRes.error) throw new Error(pkgRes.message);
        if (vulnRes.error) throw new Error(vulnRes.message);
        setPackages(pkgRes.packages);
        setVulns(vulnRes.vulnerabilities);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    const handle = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((r) => setSearchResults(r.results ?? []));
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  if (error) {
    return (
      <ErrorState
        message={error}
        hint="Check that your CognoDB instance is running and env vars are set, then reload."
      />
    );
  }

  return (
    <div className="space-y-16">
      <section>
        <p className="font-mono text-xs text-signal mb-2">
          dependency &amp; vulnerability exposure explorer
        </p>
        <h1 className="text-3xl font-semibold tracking-tight max-w-2xl">
          Trace how one CVE reaches every package downstream.
        </h1>
        <p className="text-muted mt-3 max-w-xl">
          DepScope walks the dependency graph so you don&apos;t have to —
          pick a package or a vulnerability and follow the trace.
        </p>
        <div className="mt-6 relative max-w-md">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search packages…"
            className="w-full bg-surface border border-hairline rounded-node px-4 py-2.5 font-mono text-sm text-ink placeholder:text-faint focus:border-signal/50 outline-none transition-colors"
          />
          {searchResults && (
            <div className="absolute z-10 mt-1 w-full bg-surface2 border border-hairline rounded-node overflow-hidden">
              {searchResults.length === 0 ? (
                <p className="px-4 py-3 text-xs text-faint font-mono">
                  No packages match &ldquo;{query}&rdquo;.
                </p>
              ) : (
                searchResults.map((p) => (
                  <Link
                    key={p.name}
                    href={`/packages/${encodeURIComponent(p.name)}`}
                    className="block px-4 py-2.5 hover:bg-surface transition-colors border-b border-hairline last:border-0"
                  >
                    <span className="font-mono text-sm text-ink">
                      {p.name}
                    </span>
                    <span className="block text-xs text-faint truncate">
                      {p.description}
                    </span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionHeader
          label="Packages"
          detail={packages ? `${packages.length} in graph` : undefined}
        />
        {packages === null ? (
          <LoadingRows count={5} />
        ) : packages.length === 0 ? (
          <EmptyState
            title="No packages yet."
            hint="Run `npm run seed` to load sample data into your CognoDB instance."
          />
        ) : (
          <div className="grid gap-2">
            {packages.map((p) => (
              <Link
                key={p.name}
                href={`/packages/${encodeURIComponent(p.name)}`}
                className="group flex items-center justify-between gap-4 bg-surface border border-hairline rounded-node px-4 py-3 hover:border-signal/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-ink group-hover:text-signal transition-colors">
                      {p.name}
                    </span>
                    <span className="text-[10px] font-mono text-faint uppercase">
                      {p.ecosystem}
                    </span>
                  </div>
                  <p className="text-xs text-muted truncate max-w-md">
                    {p.description}
                  </p>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs text-faint shrink-0">
                  <span title="direct dependencies">
                    ↓{p.directDependencyCount}
                  </span>
                  <span title="direct dependents">
                    ↑{p.directDependentCount}
                  </span>
                  {p.directVulnerabilityCount > 0 && (
                    <span className="text-critical" title="vulnerabilities">
                      ⚠{p.directVulnerabilityCount}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section id="vulnerabilities">
        <SectionHeader
          label="Vulnerabilities"
          detail={vulns ? `${vulns.length} tracked` : undefined}
        />
        {vulns === null ? (
          <LoadingRows count={3} />
        ) : vulns.length === 0 ? (
          <EmptyState title="No vulnerabilities recorded." />
        ) : (
          <div className="grid gap-2">
            {vulns.map((v) => (
              <Link
                key={v.id}
                href={`/vulnerabilities/${encodeURIComponent(v.id)}`}
                className="group flex items-center justify-between gap-4 bg-surface border border-hairline rounded-node px-4 py-3 hover:border-critical/40 transition-colors"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <SeverityBadge severity={v.severity as Severity} />
                  <div className="min-w-0">
                    <span className="font-mono text-sm text-ink">
                      {v.id}
                    </span>
                    <p className="text-xs text-muted truncate max-w-lg">
                      {v.summary}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs text-faint shrink-0">
                  {v.affectedCount} direct
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({
  label,
  detail,
}: {
  label: string;
  detail?: string;
}) {
  return (
    <div className="flex items-baseline justify-between mb-4">
      <h2 className="font-mono text-sm text-ink uppercase tracking-wide">
        {label}
      </h2>
      {detail && (
        <span className="font-mono text-xs text-faint">{detail}</span>
      )}
    </div>
  );
}
