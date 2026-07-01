import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// This is a factory function used by the Cloudflare Worker, which receives DATABASE_URL via
//rather than process.env
export function createDb(databaseUrl: string) {
  return drizzle(neon(databaseUrl));
}

// Singleton for scripts and migration tooling running in Node.js
export const db = createDb(process.env["DATABASE_URL"] ?? "");
