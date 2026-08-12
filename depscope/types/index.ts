export type Severity = "critical" | "high" | "medium" | "low";

export interface PackageNode {
  name: string;
  ecosystem: string;
  description: string;
  latestVersion: string;
}

export interface MaintainerNode {
  username: string;
  name: string;
}

export interface VulnerabilityNode {
  id: string; // e.g. DEP-2024-0113
  severity: Severity;
  cvssScore: number;
  summary: string;
  publishedAt: string; // ISO date
}

export interface DependencyEdge {
  from: string;
  to: string;
  versionRange: string;
  kind: "direct" | "dev";
}

export interface PackageWithStats extends PackageNode {
  directDependencyCount: number;
  directDependentCount: number;
  directVulnerabilityCount: number;
}

export interface ExposurePathStep {
  name: string;
  type: "package" | "vulnerability";
}

export interface ExposedPackage {
  path: ExposurePathStep[]; // vulnerability -> ... -> exposed package
  hops: number;
}

export interface VulnerabilityExposure {
  vulnerability: VulnerabilityNode;
  directlyAffected: PackageNode[];
  transitivelyExposed: ExposedPackage[];
}

export interface PackageExposure {
  package: PackageNode;
  vulnerabilities: {
    vulnerability: VulnerabilityNode;
    path: ExposurePathStep[];
    hops: number;
  }[];
}
