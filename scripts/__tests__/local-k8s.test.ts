import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "..", "..");

function read(path: string) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("local Kubernetes deployment configuration", () => {
  it("renders the current overlay resource list without in-cluster PostgreSQL", () => {
    const kustomization = read("k8s/local/kustomization.yaml");

    expect(kustomization).toContain("- namespace.yaml");
    expect(kustomization).toContain("- secrets.yaml");
    expect(kustomization).toContain("- migrate-job.yaml");
    expect(kustomization).toContain("- app.yaml");
    expect(kustomization).not.toContain("postgres.yaml");
  });

  it("points app and migration resources at host Docker PostgreSQL", () => {
    const secrets = read("k8s/local/secrets.yaml");
    const app = read("k8s/local/app.yaml");
    const migrate = read("k8s/local/migrate-job.yaml");

    expect(secrets).toContain("database-url: postgresql://postgres:postgres@host.docker.internal:55432/atomicly?schema=public");
    expect(secrets).toContain("auth-secret:");
    expect(secrets).not.toContain("postgres-user");
    expect(app).toContain("key: database-url");
    expect(migrate).toContain("key: database-url");
  });

  it("defines the expected web service, deployment image, and health probes", () => {
    const app = read("k8s/local/app.yaml");

    expect(app).toContain("name: atomicly-web");
    expect(app).toContain("type: NodePort");
    expect(app).toContain("nodePort: 30080");
    expect(app).toContain("image: atomicly:local");
    expect(app).toContain("imagePullPolicy: Never");
    expect(app).toContain("path: /api/healthz");
    expect(app).toContain("runAsNonRoot: true");
    expect(app).toContain("drop: [\"ALL\"]");
  });

  it("keeps migrator image names and Dockerfile targets aligned with the README", () => {
    const migrate = read("k8s/local/migrate-job.yaml");
    const dockerfile = read("Dockerfile");
    const readme = read("README.md");

    expect(migrate).toContain("image: atomicly-migrator:local");
    expect(dockerfile).toContain("FROM deps AS migrator");
    expect(dockerfile).toContain("FROM base AS runner");
    expect(readme).toContain("--target runner");
    expect(readme).toContain("--target migrator");
    expect(readme).toContain("atomicly:local");
    expect(readme).toContain("atomicly-migrator:local");
    expect(readme).toContain("http://localhost:30080");
    expect(readme).toContain("host.docker.internal:55432");
  });
});
