import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {}

// Base de pruebas: la misma URI con la base "<nombre>_test".
export const testMongoUri = (process.env.MONGODB_URI ?? "").replace(/\/([^/?]+)(\?|$)/, "/$1_test$2");
if (!testMongoUri.includes("_test")) throw new Error("No se pudo derivar la base de pruebas de MONGODB_URI");

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: "http://localhost:3100" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { MONGODB_URI: testMongoUri },
  },
});
