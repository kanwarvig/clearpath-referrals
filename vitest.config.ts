import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  test: { exclude: ["tests/e2e/**", "node_modules/**", ".next/**"], coverage: { provider: "v8", reporter: ["text", "json-summary"] } },
});
