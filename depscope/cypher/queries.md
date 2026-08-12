# Main queries

All queries below are run through the official Neo4j driver with parameters
(`$name`, `$id`, …) — never string-concatenated. Source: `lib/queries.ts`.

## 1. Transitive vulnerability exposure (the headline multi-hop query)

> "If CVE `DEP-2024-0113` hits `minimist`, which packages are exposed to it —
> directly, or through any chain of dependencies?"

```cypher
MATCH (v:Vulnerability {id: $id})-[:AFFECTS]->(affected:Package)
MATCH path = (exposed:Package)-[:DEPENDS_ON*1..5]->(affected)
WHERE exposed <> affected
WITH exposed, affected, path, length(path) AS hops
ORDER BY hops ASC
WITH exposed, collect({affected: affected, path: path, hops: hops})[0] AS best
RETURN exposed, best.path AS path, best.hops AS hops
ORDER BY hops ASC, exposed.name ASC
```

This is a **variable-length traversal** (`*1..5`) over the `DEPENDS_ON`
relationship, walked backwards from the affected package to find everything
that depends on it, at any depth, and keeps the shortest path found for each
exposed package.

**Why this is awkward in SQL:** a relational schema would model dependencies
as a `depends_on(from_id, to_id)` join table. Answering "everything reachable
within N hops" requires either N chained self-joins (one per hop, decided in
advance) or a recursive CTE with manual cycle-guarding and path bookkeeping.
Neither approach lets you cheaply return *the actual path*, which is the part
a security engineer actually needs to see (source: `app/api/vulnerabilities/[id]/exposure/route.ts`,
rendered by `components/PathTrace.tsx`).

## 2. Inverse view — a package's own transitive exposure

> "Which vulnerabilities is `express` exposed to, through anything it
> depends on?"

```cypher
MATCH (p:Package {name: $name})
MATCH path = (p)-[:DEPENDS_ON*0..5]->(dep:Package)
MATCH (v:Vulnerability)-[:AFFECTS]->(dep)
WITH v, path, length(path) AS hops
ORDER BY hops ASC
WITH v, collect(path)[0] AS best, min(hops) AS hops
RETURN v, best AS path, hops
ORDER BY v.cvssScore DESC
```

The `*0..5` lower bound of `0` deliberately includes the package itself, so
direct hits (hop 0) and transitive hits are returned by the same query and
just distinguished by `hops` in the UI.

## 3. Package detail — one round trip, four relationship types

```cypher
MATCH (p:Package {name: $name})
OPTIONAL MATCH (p)-[dep:DEPENDS_ON]->(d:Package)
OPTIONAL MATCH (p)<-[rdep:DEPENDS_ON]-(r:Package)
OPTIONAL MATCH (p)-[:MAINTAINED_BY]->(m:Maintainer)
OPTIONAL MATCH (v:Vulnerability)-[:AFFECTS]->(p)
RETURN p,
       collect(DISTINCT { pkg: d, versionRange: dep.versionRange, kind: dep.kind }) AS deps,
       collect(DISTINCT { pkg: r, versionRange: rdep.versionRange, kind: rdep.kind }) AS rdeps,
       collect(DISTINCT { username: m.username, name: m.name }) AS maintainers,
       collect(DISTINCT v) AS vulns
```

Fan-in (`dependents`) and fan-out (`dependencies`) for a node are single-hop
pattern matches in *either* direction on the same relationship type — no
separate "reverse" table or join needed, unlike a relational `depends_on`
table where the reverse lookup means flipping which column you filter on
and hoping the right index exists.

## 4. Dashboard aggregate (fan-in/fan-out/vuln counts for every package)

```cypher
MATCH (p:Package)
OPTIONAL MATCH (p)-[:DEPENDS_ON]->(dep:Package)
OPTIONAL MATCH (p)<-[:DEPENDS_ON]-(dependent:Package)
OPTIONAL MATCH (v:Vulnerability)-[:AFFECTS]->(p)
RETURN p,
       count(DISTINCT dep) AS depCount,
       count(DISTINCT dependent) AS dependentCount,
       count(DISTINCT v) AS vulnCount
ORDER BY vulnCount DESC, p.name ASC
```

## 5. Free-text package search

```cypher
MATCH (p:Package)
WHERE toLower(p.name) CONTAINS toLower($q)
   OR toLower(p.description) CONTAINS toLower($q)
RETURN p ORDER BY p.name LIMIT 20
```
