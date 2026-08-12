/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // neo4j-driver ships some Node-only bits; keep it out of the client bundle.
  experimental: {
    serverComponentsExternalPackages: ["neo4j-driver"],
  },
};

module.exports = nextConfig;
