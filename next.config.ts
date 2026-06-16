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
};

export default nextConfig;
