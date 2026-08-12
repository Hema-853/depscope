// Run once against a fresh CognoDB instance (scripts/seed.ts does this automatically).

CREATE CONSTRAINT package_name IF NOT EXISTS
FOR (p:Package) REQUIRE p.name IS UNIQUE;

CREATE CONSTRAINT vuln_id IF NOT EXISTS
FOR (v:Vulnerability) REQUIRE v.id IS UNIQUE;

CREATE CONSTRAINT maintainer_username IF NOT EXISTS
FOR (m:Maintainer) REQUIRE m.username IS UNIQUE;
