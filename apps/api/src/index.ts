import { Hono } from "hono";

export type Bindings = {
  DATABASE_URL: string;
  SUPABASE_JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

export type AppType = typeof app;
export default app;
