import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/vendor/**",
    ".open-next/**",
  ]),
  {
    rules: {
      // images are served as-is in the mock phase (no optimizer on Workers yet)
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
