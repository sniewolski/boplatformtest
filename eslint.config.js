import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Modularity: tools/* must not import sibling tools. Each tool is
  // self-contained; cross-tool composition happens through the registry.
  {
    files: ["src/tools/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/tools/*", "@/tools/*/**"],
              message:
                "Tools must not import sibling tools. Use the registry, or extract shared code to src/core/.",
            },
          ],
        },
      ],
    },
  },
  // Modularity: core/* must not depend on tools/*. Core ships the shell,
  // guards, and registry contract — never knowledge of any specific tool.
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/tools/*", "@/tools/*/**"],
              message:
                "core/* cannot import from tools/*. Tools depend on core, not the other way round.",
            },
          ],
        },
      ],
    },
  },
  eslintPluginPrettier,
);
