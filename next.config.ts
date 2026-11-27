import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output produces a minimal server.js for Docker containers.
  // In CI E2E tests, we skip standalone so `next start` works reliably.
  output: process.env.NEXT_OUTPUT_STANDALONE === "false" ? undefined : "standalone",
  deploymentId: process.env.DEPLOYMENT_VERSION,
  // Don't advertise the framework/version in the X-Powered-By header — it gives
  // attackers a free fingerprint for targeting known framework CVEs. Security
  // response headers (CSP, HSTS, etc.) are set centrally in proxy.ts.
  poweredByHeader: false,
  // ADR-0003 nav hubs: "Reflect" and "Insights" are tab groups over existing
  // pages, so their hub URLs land on the first tab. Temporary (307) so we can
  // give the hubs their own page later without browsers having cached this.
  async redirects() {
    return [
      { source: "/reflect", destination: "/journal", permanent: false },
      { source: "/insights", destination: "/analytics", permanent: false },
    ];
  },
};

export default nextConfig;
