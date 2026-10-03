import { execSync } from "node:child_process";
import { testMongoUri } from "../../playwright.config";

// Las E2E corren contra una base aparte con datos de ejemplo; nunca tocan la base real.
export default function globalSetup() {
  execSync("npx tsx scripts/seed.ts", { stdio: "inherit", env: { ...process.env, MONGODB_URI: testMongoUri, SEED_DEMO: "1" } });
}
