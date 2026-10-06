import { defineConfig } from "vitest/config";
import { resolve } from "path";

// v2.11.0 Phase 5 -- opt-in local smoke tests that need a running Ollama and
// the OCR runtime. Kept out of `configs/vitest.config.ts`, whose include globs
// cover only tests/unit and tests/integration, so neither `npm test` nor CI
// runs them. Run with:
//   NEXUS_OUTLINE_SMOKE=1 npx vitest run --config configs/vitest.smoke.config.ts
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: [resolve(__dirname, "../tests/setup.ts")],
    include: ["tests/smoke/**/*.test.ts"],
    // 24 questions x 4 arms x 2 models at up to 4 minutes each; gemma4:12b
    // calibrated at close to that cap, so the full run needs more than 6 hours.
    testTimeout: 12 * 60 * 60 * 1000,
    hookTimeout: 60 * 60 * 1000,
    fileParallelism: false,
  },
});
