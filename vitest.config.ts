import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Keep vitest's defaults, but never pick up the Playwright e2e specs
    // (they live under worktrees / tests/e2e and use @playwright/test, which
    // throws when loaded by vitest).
    exclude: [...configDefaults.exclude, "**/.worktrees/**", "**/tests/e2e/**"],
  },
});
