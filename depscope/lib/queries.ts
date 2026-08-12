import { withSession } from "./db";
import type {
  PackageNode,
  PackageWithStats,
  VulnerabilityNode,
  VulnerabilityExposure,
  PackageExposure,
  ExposedPackage,
} from "@/types";

const toPackage = (n: any): PackageNode => ({
  name: n.properties.name,
  ecosystem: n.properties.ecosystem,
  description: n.properties.description,
  latestVersion: n.properties.latestVersion,
});

const toVuln = (n: any): VulnerabilityNode => ({
  id: n.properties.id,
  severity: n.properties.severity,
  cvssScore: n.properties.cvssScore,
  summary: n.properties.summary,
  publishedAt: n.properties.publishedAt,
});

/** Simple substring search across package name/description. */
export async function searchPackages(q: string): Promise<PackageNode[]> {
  return withSession(async (session) => {
    const result = await session.executeRead((tx) =>
      tx.run(
        `MATCH (p:Package)
         WHERE toLower(p.name) CONTAINS toLower($q)
            OR toLower(p.description) CONTAINS toLower($q)
         RETURN p ORDER BY p.name LIMIT 20`,
        { q }
      )
    );
    return result.records.map((r) => toPackage(r.get("p")));
  });
}

/** Dashboard listing: packages with a quick fan-in/fan-out/vuln count. */
export async function listPackagesWithStats(): Promise<PackageWithStats[]> {
  return withSession(async (session) => {
    const result = await session.executeRead((tx) =>
      tx.run(
        `MATCH (p:Package)
         OPTIONAL MATCH (p)-[:DEPENDS_ON]->(dep:Package)
         OPTIONAL MATCH (p)<-[:DEPENDS_ON]-(dependent:Package)
         OPTIONAL MATCH (v:Vulnerability)-[:AFFECTS]->(p)
         RETURN p,
                count(DISTINCT dep) AS depCount,
                count(DISTINCT dependent) AS dependentCount,
                count(DISTINCT v) AS vulnCount
         ORDER BY vulnCount DESC, p.name ASC`
      )
    );
    return result.records.map((r) => ({
      ...toPackage(r.get("p")),
      directDependencyCount: r.get("depCount").toNumber(),
      directDependentCount: r.get("dependentCount").toNumber(),
      directVulnerabilityCount: r.get("vulnCount").toNumber(),
    }));
  });
}

export async function listVulnerabilities(): Promise<
  (VulnerabilityNode & { affectedCount: number })[]
> {
  return withSession(async (session) => {
    const result = await session.executeRead((tx) =>
      tx.run(
        `MATCH (v:Vulnerability)
         OPTIONAL MATCH (v)-[:AFFECTS]->(p:Package)
         RETURN v, count(DISTINCT p) AS affectedCount
         ORDER BY v.cvssScore DESC`
      )
    );
    return result.records.map((r) => ({
      ...toVuln(r.get("v")),
      affectedCount: r.get("affectedCount").toNumber(),
    }));
  });
}

export async function getPackage(name: string): Promise<{
  package: PackageNode;
  dependencies: (PackageNode & { versionRange: string; kind: string })[];
  dependents: (PackageNode & { versionRange: string; kind: string })[];
  maintainers: { username: string; name: string }[];
  directVulnerabilities: VulnerabilityNode[];
} | null> {
  return withSession(async (session) => {
    const result = await session.executeRead((tx) =>
      tx.run(
        `MATCH (p:Package {name: $name})
         OPTIONAL MATCH (p)-[dep:DEPENDS_ON]->(d:Package)
         OPTIONAL MATCH (p)<-[rdep:DEPENDS_ON]-(r:Package)
         OPTIONAL MATCH (p)-[:MAINTAINED_BY]->(m:Maintainer)
         OPTIONAL MATCH (v:Vulnerability)-[:AFFECTS]->(p)
         RETURN p,
                collect(DISTINCT { pkg: d, versionRange: dep.versionRange, kind: dep.kind }) AS deps,
                collect(DISTINCT { pkg: r, versionRange: rdep.versionRange, kind: rdep.kind }) AS rdeps,
                collect(DISTINCT { username: m.username, name: m.name }) AS maintainers,
                collect(DISTINCT v) AS vulns`,
        { name }
      )
    );
    if (result.records.length === 0) return null;
    const rec = result.records[0];
    const p = rec.get("p");
    if (!p) return null;

    const mapEdge = (e: any) =>
      e.pkg
        ? { ...toPackage(e.pkg), versionRange: e.versionRange, kind: e.kind }
        : null;

    return {
      package: toPackage(p),
      dependencies: rec.get("deps").map(mapEdge).filter(Boolean),
      dependents: rec.get("rdeps").map(mapEdge).filter(Boolean),
      maintainers: rec
        .get("maintainers")
        .filter((m: any) => m.username),
      directVulnerabilities: rec.get("vulns").filter(Boolean).map(toVuln),
    };
  });
}

export async function getVulnerability(
  id: string
): Promise<VulnerabilityNode | null> {
  return withSession(async (session) => {
    const result = await session.executeRead((tx) =>
      tx.run(`MATCH (v:Vulnerability {id: $id}) RETURN v`, { id })
    );
    if (result.records.length === 0) return null;
    return toVuln(result.records[0].get("v"));
  });
}

/**
 * The headline multi-hop query: given a vulnerability, find every package
 * that is exposed to it transitively through the dependency graph — not
 * just the packages that declare it directly, but everything downstream
 * that depends on one of those, up to 5 hops out. In SQL this is an
 * unbounded-depth self-join / recursive CTE over a "depends_on" edge
 * table; here it's a single variable-length pattern.
 */
export async function getVulnerabilityExposure(
  id: string,
  maxHops = 5
): Promise<VulnerabilityExposure | null> {
  return withSession(async (session) => {
    const vulnResult = await session.executeRead((tx) =>
      tx.run(`MATCH (v:Vulnerability {id: $id}) RETURN v`, { id })
    );
    if (vulnResult.records.length === 0) return null;
    const vulnerability = toVuln(vulnResult.records[0].get("v"));

    const directResult = await session.executeRead((tx) =>
      tx.run(
        `MATCH (v:Vulnerability {id: $id})-[:AFFECTS]->(p:Package)
         RETURN DISTINCT p ORDER BY p.name`,
        { id }
      )
    );
    const directlyAffected = directResult.records.map((r) =>
      toPackage(r.get("p"))
    );

    // Variable-length traversal: walk DEPENDS_ON backwards from each
    // directly-affected package to find every transitive dependent,
    // keeping the shortest exposure path for each one.
    const transitiveResult = await session.executeRead((tx) =>
      tx.run(
        `MATCH (v:Vulnerability {id: $id})-[:AFFECTS]->(affected:Package)
         MATCH path = (exposed:Package)-[:DEPENDS_ON*1..${maxHops}]->(affected)
         WHERE exposed <> affected
         WITH exposed, affected, path, length(path) AS hops
         ORDER BY hops ASC
         WITH exposed, collect({affected: affected, path: path, hops: hops})[0] AS best
         RETURN exposed, best.path AS path, best.hops AS hops
         ORDER BY hops ASC, exposed.name ASC`,
        { id }
      )
    );

    const transitivelyExposed: ExposedPackage[] = transitiveResult.records.map(
      (r) => {
        const path = r.get("path");
        const nodeNames: string[] = path.segments.map(
          (s: any) => s.start.properties.name as string
        );
        nodeNames.push(
          path.segments[path.segments.length - 1].end.properties.name
        );
        return {
          hops: r.get("hops").toNumber(),
          path: [
            { name: vulnerability.id, type: "vulnerability" as const },
            ...nodeNames.map((n) => ({ name: n, type: "package" as const })),
          ],
        };
      }
    );

    return { vulnerability, directlyAffected, transitivelyExposed };
  });
}

/**
 * The inverse view: for a given package, which vulnerabilities is it
 * exposed to — either directly, or transitively through anything it
 * depends on?
 */
export async function getPackageExposure(
  name: string,
  maxHops = 5
): Promise<PackageExposure | null> {
  return withSession(async (session) => {
    const pkgResult = await session.executeRead((tx) =>
      tx.run(`MATCH (p:Package {name: $name}) RETURN p`, { name })
    );
    if (pkgResult.records.length === 0) return null;
    const pkg = toPackage(pkgResult.records[0].get("p"));

    const result = await session.executeRead((tx) =>
      tx.run(
        `MATCH (p:Package {name: $name})
         MATCH path = (p)-[:DEPENDS_ON*0..${maxHops}]->(dep:Package)
         MATCH (v:Vulnerability)-[:AFFECTS]->(dep)
         WITH v, path, length(path) AS hops
         ORDER BY hops ASC
         WITH v, collect(path)[0] AS best, min(hops) AS hops
         RETURN v, best AS path, hops
         ORDER BY v.cvssScore DESC`,
        { name }
      )
    );

    const vulnerabilities = result.records.map((r) => {
      const path = r.get("path");
      const nodeNames: string[] =
        path.segments.length > 0
          ? [
              path.segments[0].start.properties.name,
              ...path.segments.map((s: any) => s.end.properties.name),
            ]
          : [pkg.name];
      return {
        vulnerability: toVuln(r.get("v")),
        hops: r.get("hops").toNumber(),
        path: [
          ...nodeNames.map((n) => ({ name: n, type: "package" as const })),
          { name: r.get("v").properties.id, type: "vulnerability" as const },
        ],
      };
    });

    return { package: pkg, vulnerabilities };
  });
}
