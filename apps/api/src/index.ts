import { Hono } from "hono";
import { authMiddleware } from "./middleware/auth";
import type { Variables } from "./middleware/auth";

export type Bindings = {
  DATABASE_URL: string;
  SUPABASE_JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

// Protected route group - auth required for all /sync routes
export const sync = new Hono<{ Bindings: Bindings; Variables: Variables }>();
sync.use(authMiddleware);

app.route("/sync", sync);

export type AppType = typeof app;
export default app;
