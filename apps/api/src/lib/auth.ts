import type { FastifyReply, FastifyRequest } from "fastify";

/** preHandler: any signed-in user (customer or staff). */
export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.status(401).send({ success: false, error: "Please sign in" });
  }
}

/** Tiny in-memory rate limiter (per key, per window). Fine for one process; use Redis when scaling out. */
const hits = new Map<string, number[]>();
export function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return recent.length > max;
}
