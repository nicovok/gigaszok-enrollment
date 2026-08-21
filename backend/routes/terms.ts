import { requireAuth } from "../middleware";
import { db } from "../db";
import type { BunRequest, Term } from "../schema";
import { randomUUID, randomBytes } from "crypto";

function generateSecret(): string {
  return randomBytes(24).toString("base64url");
}

export const termRoutes = {
  "/api/terms": {
    async GET(req: Request) {
      await requireAuth(req);
      const terms = db.prepare(`SELECT * FROM terms ORDER BY created_at DESC`).all() as Term[];
      return Response.json(terms);
    },

    async POST(req: Request) {
      await requireAuth(req);
      const { name, slug } = await req.json() as { name: string; slug: string };
      if (!name?.trim() || !slug?.trim()) {
        return Response.json({ error: "name and slug are required" }, { status: 400 });
      }
      const id = randomUUID();
      const webhook_secret = generateSecret();
      try {
        db.prepare(`INSERT INTO terms (id, name, slug, active, webhook_secret, created_at) VALUES (?, ?, ?, 1, ?, ?)`)
          .run(id, name.trim(), slug.trim(), webhook_secret, Date.now());
      } catch (e) {
        if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
          return Response.json({ error: "Slug already exists" }, { status: 409 });
        }
        throw e;
      }
      return Response.json({ id, name: name.trim(), slug: slug.trim(), active: 1, webhook_secret }, { status: 201 });
    },
  },

  "/api/terms/:id": {
    async PUT(req: Request) {
      await requireAuth(req);
      const id = (req as BunRequest<{ id: string }>).params.id;
      const { name, slug, active } = await req.json() as Partial<Term>;
      db.prepare(`UPDATE terms SET name = COALESCE(?, name), slug = COALESCE(?, slug), active = COALESCE(?, active) WHERE id = ?`)
        .run(name ?? null, slug ?? null, active ?? null, id);
      return Response.json({ ok: true });
    },

    async DELETE(req: Request) {
      await requireAuth(req);
      const id = (req as BunRequest<{ id: string }>).params.id;
      const count = db.prepare(`SELECT COUNT(*) as n FROM applicants WHERE term_id = ?`).get(id) as { n: number };
      if (count.n > 0) {
        return Response.json({ error: "Cannot delete term with applicants" }, { status: 409 });
      }
      db.prepare(`DELETE FROM terms WHERE id = ?`).run(id);
      return Response.json({ ok: true });
    },
  },
};
