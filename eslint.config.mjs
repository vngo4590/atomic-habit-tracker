import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Architecture fitness functions (see docs/architecture/adr/0001-*.md).
  // Other modules may use a feature only through its public `index.ts`.
  // Inside a feature, use relative imports.
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/*", "@/features/*/*/**"],
              message: "Import a feature through its public API: '@/features/<name>'.",
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
          ],
          patterns: [
            { group: ["@/features/*/*", "@/features/*/*/**"], message: "Use the feature's public API." },
            { group: ["@/lib/db/**", "@/lib/repositories/**", "@/lib/generated/**", "**/server/**"], message: "model/ is pure: no I/O." },
          ],
        },
      ],
    },
  },
  // Keep new modules small and single-purpose (~300 lines, ignoring blank lines and comments).
  {
    files: ["features/**/*.{ts,tsx}", "shared/**/*.{ts,tsx}"],
    ignores: ["**/__tests__/**", "**/*.test.{ts,tsx}"],
    rules: {
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
    },
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
