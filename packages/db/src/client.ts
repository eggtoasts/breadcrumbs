import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Factory used by the Cloudflare Worker (receives DATABASE_URL via bindings, not process.env).
export function createDb(databaseUrl: string) {
  return drizzle(neon(databaseUrl), { schema });
}

// Singleton for migration scripts and Drizzle Studio running in Node.js.
export const db = createDb(process.env["DATABASE_URL"] ?? "");
