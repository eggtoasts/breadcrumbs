import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { jwtVerify } from "jose";
import type { Bindings } from "../index";

export type Variables = {
  userId: string;
};

export const authMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const authorization = c.req.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Missing Bearer token" });
  }

  const token = authorization.slice(7);
  const secret = new TextEncoder().encode(c.env.SUPABASE_JWT_SECRET);

  let payload: { sub?: string };
  try {
    ({ payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] }));
  } catch {
    throw new HTTPException(401, { message: "Invalid or expired token" });
  }

  if (!payload.sub) {
    throw new HTTPException(401, { message: "Token missing sub claim" });
  }

  c.set("userId", payload.sub);
  await next();
});
