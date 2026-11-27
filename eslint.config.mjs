import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Architecture fitness functions (see docs/architecture/adr/0001-*.md).
  // Other modules may use a feature only through its public entry points:
  // `index` (client-safe), `actions` (server actions), `server` (server-only
  // data access) and `store` (client-only cache slice, composed by
  // `lib/store`). Inside a feature, use relative imports.
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "framer-motion",
              importNames: ["motion"],
              message: "Use `m` (LazyMotion, see components/motion/MotionProvider.tsx); `motion` ships the full engine in the first load.",
            },
          ],
          patterns: [
            {
              group: ["@/features/*/*", "@/features/*/*/**", "!@/features/*/actions", "!@/features/*/server", "!@/features/*/store", "!@/features/*/contracts", "!@/features/*/ui"],
              message: "Import a feature through '@/features/<name>', '/actions', '/server', '/store', '/contracts' or '/ui' only.",
            },
          ],
        },
      ],
    },
  },
  // Pure domain logic must stay free of React, the database and server code,
  // so it is cheap to unit test and safe to run on client or server.
  {
    files: ["features/*/model/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "model/ is pure: no React." },
            { name: "server-only", message: "model/ is pure: no server-only code." },
            { name: "pg", message: "model/ is pure: no database drivers." },
          ],
          patterns: [
            { group: ["@/features/*/*", "@/features/*/*/**", "!@/features/*/actions", "!@/features/*/server", "!@/features/*/contracts"], message: "Use the feature's public API." },
            {
              // Aliased and relative paths to database/server/action modules, plus the Prisma packages.
              group: ["@prisma/*", "**/db", "**/db/**", "**/repositories", "**/repositories/**", "**/generated/**", "**/server", "**/server/**", "**/actions"],
              message: "model/ is pure: no I/O.",
            },
          ],
        },
      ],
    },
  },
  // Keep new modules small and single-purpose (~300 lines, ignoring blank lines and comments).
  {
    files: ["features/**/*.{ts,tsx}", "components/ui/**/*.{ts,tsx}"],
    ignores: ["**/__tests__/**", "**/*.test.{ts,tsx}"],
    rules: {
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  // Tests may reach into internals to exercise them directly.
  {
    files: ["**/__tests__/**", "**/*.test.{ts,tsx}", "e2e/**"],
    rules: { "no-restricted-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Reference UI is a standalone HTML/JSX implementation, not part of the Next.js app
    "reference_ui/**",
  ]),
]);

export default eslintConfig;
