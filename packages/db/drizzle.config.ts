import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "node:path";

// pnpm sets cwd = packages/db before running scripts, so ../../.env is the repo root.
config({ path: resolve(process.cwd(), "../../.env") });

const url = process.env["DATABASE_URL"];
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env at the repo root and fill it in.",
  );
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url },
});
