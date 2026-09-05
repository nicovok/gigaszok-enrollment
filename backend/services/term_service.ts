import { db } from "../db";
import { NotFoundError, ConflictError } from "../errors";
import { randomUUID, randomBytes } from "crypto";
import type { Term } from "../schema";

function generateSecret(): string {
  return randomBytes(24).toString("base64url");
}

export function listTerms(): Term[] {
  return db.prepare(`SELECT * FROM terms ORDER BY created_at DESC`).all() as Term[];
}

export function createTerm(name: string, slug: string): Term {
  const id = randomUUID();
  const webhook_secret = generateSecret();
  try {
    db.prepare(`INSERT INTO terms (id, name, slug, active, webhook_secret, created_at) VALUES (?, ?, ?, 1, ?, ?)`)
      .run(id, name, slug, webhook_secret, Date.now());
  } catch (e) {
    if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
      throw new ConflictError("Slug already exists");
    }
    throw e;
  }
  return { id, name, slug, active: 1, webhook_secret, created_at: Date.now() };
}

export function updateTerm(id: string, data: Partial<Pick<Term, "name" | "slug" | "active">>): void {
  db.prepare(`UPDATE terms SET name = COALESCE(?, name), slug = COALESCE(?, slug), active = COALESCE(?, active) WHERE id = ?`)
    .run(data.name ?? null, data.slug ?? null, data.active ?? null, id);
}

export function deleteTerm(id: string): void {
  const count = db.prepare(`SELECT COUNT(*) as n FROM applicants WHERE term_id = ?`).get(id) as { n: number };
  if (count.n > 0) throw new ConflictError("Cannot delete term with applicants");
  db.prepare(`DELETE FROM terms WHERE id = ?`).run(id);
}

export function findTermBySlug(slug: string): Term | undefined {
  return db.prepare(`SELECT * FROM terms WHERE slug = ? AND active = 1`).get(slug) as Term | undefined;
}

export function requireTerm(termId: string): Term {
  const term = db.prepare(`SELECT * FROM terms WHERE id = ?`).get(termId) as Term | null;
  if (!term) throw new NotFoundError("Term not found");
  return term;
}
