import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../lib/db.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  wholesaleApplicant: z.boolean().optional(),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  const sign = (u: any) => ({
    accessToken: app.jwt.sign(
      { sub: u.id, role: u.role, wholesale: u.is_wholesale && u.wholesale_status === "APPROVED" },
      { expiresIn: "15m" }
    ),
    refreshToken: app.jwt.sign({ sub: u.id, role: u.role, wholesale: false }, { expiresIn: "30d" }),
  });

  app.post("/register", async (req, reply) => {
    const b = registerSchema.parse(req.body);
    // Role is never client-controlled; wholesale applicants start PENDING and need admin approval.
    const hash = await bcrypt.hash(b.password, 12);
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, wholesale_status)
         VALUES (lower($1),$2,$3,$4,$5,$6) RETURNING id, email, role, is_wholesale, wholesale_status`,
        [b.email, hash, b.firstName, b.lastName, b.phone, b.wholesaleApplicant ? "PENDING" : "NONE"]
      );
      return reply.status(201).send({ user: rows[0], ...sign(rows[0]) });
    } catch (e: any) {
      if (e.code === "23505") return reply.status(409).send({ success: false, error: "Email already registered" });
      throw e;
    }
  });

  app.post("/login", async (req, reply) => {
    const b = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const { rows } = await pool.query("SELECT * FROM users WHERE email = lower($1)", [b.email]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(b.password, u.password_hash))) {
      return reply.status(401).send({ success: false, error: "Invalid credentials" });
    }
    return { user: { id: u.id, email: u.email, role: u.role }, ...sign(u) };
  });

  app.post("/refresh", async (req, reply) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    let sub: string;
    try {
      sub = app.jwt.verify<{ sub: string }>(refreshToken).sub;
    } catch {
      return reply.status(401).send({ success: false, error: "Invalid refresh token" });
    }
    const u = (await pool.query("SELECT * FROM users WHERE id = $1", [sub])).rows[0];
    if (!u) return reply.status(401).send({ success: false, error: "Invalid refresh token" });
    return sign(u);
  });
};
