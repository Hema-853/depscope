/**
 * Loads data/seed-data.json into CognoDB.
 *
 * Usage:
 *   COGNODB_URI=... COGNODB_USER=... COGNODB_PASSWORD=... npm run seed
 * (or put those in .env.local and load it with `dotenv -e .env.local -- npm run seed`)
 *
 * Safe to re-run: every write uses MERGE, so re-seeding an existing
 * instance just refreshes properties rather than duplicating nodes.
 */
import neo4j from "neo4j-driver";
import { readFileSync } from "fs";
import { join } from "path";

interface SeedData {
  packages: { name: string; ecosystem: string; description: string; latestVersion: string }[];
  maintainers: { username: string; name: string }[];
  maintains: { package: string; maintainer: string }[];
  dependencies: { from: string; to: string; versionRange: string; kind: string }[];
  vulnerabilities: { id: string; severity: string; cvssScore: number; summary: string; publishedAt: string }[];
  affects: { vulnerability: string; package: string; affectedVersionRange: string; patchedVersion: string }[];
}

async function main() {
  const uri = process.env.COGNODB_URI;
  const user = process.env.COGNODB_USER;
  const password = process.env.COGNODB_PASSWORD;

  if (!uri || !user || !password) {
    console.error(
      "Missing COGNODB_URI / COGNODB_USER / COGNODB_PASSWORD.\n" +
        "Set them in your environment or a .env.local file — see .env.example."
    );
    process.exit(1);
  }

  const raw = readFileSync(join(__dirname, "..", "data", "seed-data.json"), "utf-8");
  const data: SeedData = JSON.parse(raw);

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();

  try {
    await session.executeWrite((tx) => tx.run("MATCH (n) DETACH DELETE n"));
    console.log("Cleared existing graph.");

    console.log("Constraints & indexes…");
    await session.executeWrite((tx) =>
      tx.run("CREATE CONSTRAINT package_name IF NOT EXISTS FOR (p:Package) REQUIRE p.name IS UNIQUE")
    );
    await session.executeWrite((tx) =>
      tx.run("CREATE CONSTRAINT vuln_id IF NOT EXISTS FOR (v:Vulnerability) REQUIRE v.id IS UNIQUE")
    );
    await session.executeWrite((tx) =>
      tx.run("CREATE CONSTRAINT maintainer_username IF NOT EXISTS FOR (m:Maintainer) REQUIRE m.username IS UNIQUE")
    );

    console.log(`Loading ${data.packages.length} packages…`);
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MERGE (p:Package {name: row.name})
         SET p.ecosystem = row.ecosystem,
             p.description = row.description,
             p.latestVersion = row.latestVersion`,
        { rows: data.packages }
      )
    );

    console.log(`Loading ${data.maintainers.length} maintainers…`);
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MERGE (m:Maintainer {username: row.username})
         SET m.name = row.name`,
        { rows: data.maintainers }
      )
    );

    console.log(`Loading ${data.vulnerabilities.length} vulnerabilities…`);
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MERGE (v:Vulnerability {id: row.id})
         SET v.severity = row.severity,
             v.cvssScore = row.cvssScore,
             v.summary = row.summary,
             v.publishedAt = row.publishedAt`,
        { rows: data.vulnerabilities }
      )
    );

    console.log(`Loading ${data.dependencies.length} DEPENDS_ON edges…`);
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (from:Package {name: row.from})
         MATCH (to:Package {name: row.to})
         MERGE (from)-[r:DEPENDS_ON]->(to)
         SET r.versionRange = row.versionRange, r.kind = row.kind`,
        { rows: data.dependencies }
      )
    );

    console.log(`Loading ${data.maintains.length} MAINTAINED_BY edges…`);
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (p:Package {name: row.package})
         MATCH (m:Maintainer {username: row.maintainer})
         MERGE (p)-[:MAINTAINED_BY]->(m)`,
        { rows: data.maintains }
      )
    );

    console.log(`Loading ${data.affects.length} AFFECTS edges…`);
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (v:Vulnerability {id: row.vulnerability})
         MATCH (p:Package {name: row.package})
         MERGE (v)-[r:AFFECTS]->(p)
         SET r.affectedVersionRange = row.affectedVersionRange,
             r.patchedVersion = row.patchedVersion`,
        { rows: data.affects }
      )
    );

    console.log("Seed complete.");
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
