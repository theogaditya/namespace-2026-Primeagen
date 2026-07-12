import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    testTimeout: 10_000,
    server: {
      deps: {
        inline: ["zod"]
      }
    }
  },
});
