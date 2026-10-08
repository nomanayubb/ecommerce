import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth.js";
import { catalogRoutes } from "./routes/catalog.js";
import { searchRoutes } from "./routes/search.js";
import { checkoutRoutes } from "./routes/checkout.js";
import { adminRoutes } from "./routes/admin.js";
import { settingsRoutes } from "./routes/settings.js";
import { accountRoutes } from "./routes/account.js";
import { engagementRoutes } from "./routes/engagement.js";
import { templateRoutes } from "./routes/templates.js";
import { CartError } from "./lib/pricing.js";

export type Role = "SUPER_ADMIN" | "ADMIN" | "WAREHOUSE" | "CUSTOMER" | "WHOLESALE";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: Role; wholesale: boolean };
    user: { sub: string; role: Role; wholesale: boolean };
  }
}

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? (() => { throw new Error("JWT_SECRET not set"); })(),
});

// Accept an empty body with a JSON content-type (DELETE/POST-without-payload from browsers and proxies).
app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
  if (!body) return done(null, {});
  try { done(null, JSON.parse(body as string)); } catch { const e: any = new Error("Invalid JSON body"); e.statusCode = 400; done(e); }
});

app.setErrorHandler((err: any, _req, reply) => {
  if (err instanceof CartError) return reply.status(err.status).send({ success: false, error: err.message });
  if (err.name === "ZodError") return reply.status(400).send({ success: false, error: "Invalid input", issues: err.issues });
  if (err.statusCode && err.statusCode < 500) return reply.status(err.statusCode).send({ success: false, error: err.message });
  app.log.error(err);
  reply.status(500).send({ success: false, error: "Internal server error" });
});

app.get("/health", async () => ({ ok: true }));
await app.register(authRoutes, { prefix: "/api/v1/auth" });
await app.register(catalogRoutes, { prefix: "/api/v1" });
await app.register(searchRoutes, { prefix: "/api/v1" });
await app.register(checkoutRoutes, { prefix: "/api/v1" });
await app.register(settingsRoutes, { prefix: "/api/v1" });
await app.register(accountRoutes, { prefix: "/api/v1" });
await app.register(engagementRoutes, { prefix: "/api/v1" });
await app.register(templateRoutes, { prefix: "/api/v1" });
await app.register(adminRoutes, { prefix: "/api/v1/admin" });

await app.listen({ port: Number(process.env.PORT ?? 4000), host: "0.0.0.0" });
