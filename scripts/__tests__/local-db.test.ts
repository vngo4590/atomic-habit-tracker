import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../..");
const scriptPath = resolve(repoRoot, "scripts/local-db.ps1");

function runPowerShell(args: string[], extraEnv: Record<string, string>) {
  return spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...args],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        ...extraEnv,
      },
      encoding: "utf8",
    },
  );
}

describe("scripts/local-db.ps1", () => {
  it.skipIf(process.platform !== "win32")("passes fake-history tsx arguments separately", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "atomicly-local-db-"));
    const logPath = join(tempDir, "commands.log");
    const capturedScriptPath = join(tempDir, "fake-history.ts");

    writeFileSync(
      join(tempDir, "docker.cmd"),
      '@echo off\r\necho docker:%*>>"%ATOMICLY_TEST_LOG%"\r\nexit /b 0\r\n',
    );
    writeFileSync(
      join(tempDir, "npx.cmd"),
      [
        "@echo off",
        'echo npx:%*>>"%ATOMICLY_TEST_LOG%"',
        'echo npx-args:%~1^|%~2^|%~3>>"%ATOMICLY_TEST_LOG%"',
        'echo history-env:%ATOMICLY_HISTORY_USERS%^|%ATOMICLY_HISTORY_HABITS%^|%ATOMICLY_HISTORY_DAYS%>>"%ATOMICLY_TEST_LOG%"',
        "if \"%~1\"==\"tsx\" node -e \"require('fs').copyFileSync(process.argv[1], process.env.ATOMICLY_CAPTURE_TS)\" \"%CD%\\%~2\"",
        "exit /b 0",
        "",
      ].join("\r\n"),
    );

    const result = runPowerShell(
      ["fake-history", "-Users", "1", "-HabitsPerUser", "2", "-Days", "10"],
      {
        PATH: `${tempDir};${process.env.PATH ?? ""}`,
        DATABASE_URL: "postgresql://postgres:postgres@localhost:55432/atomicly?schema=public",
        NODE_ENV: "development",
        ATOMICLY_TEST_LOG: logPath,
        ATOMICLY_CAPTURE_TS: capturedScriptPath,
      },
    );

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);

    const commandLog = readFileSync(logPath, "utf8");
    expect(commandLog).toContain("docker:compose up -d postgres");
    expect(commandLog).toContain("npx:tsx scripts/.local-db-random-data.tmp.ts");
    expect(commandLog).toContain("npx-args:tsx|scripts/.local-db-random-data.tmp.ts|");
    expect(commandLog).toContain("history-env:1|2|10");

    expect(existsSync(capturedScriptPath)).toBe(true);
    const generatedScript = readFileSync(capturedScriptPath, "utf8");
    expect(generatedScript).toContain("history${userIndex}@atomicly.local");
    expect(generatedScript).toContain("db.journalEntry.create");
    expect(generatedScript).toContain("db.habitNote.create");
    expect(generatedScript).toContain("db.lessonProgress.create");
    expect(generatedScript).toContain("db.formationVerdict.create");
    // The script should also seed at least one habit stack so demo data
    // exercises the stack UI on Today and the Stack tab.
    expect(generatedScript).toContain("stackNextId");
  });
});
