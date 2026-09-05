import { requireAuth } from "../middleware";
import { listTerms, createTerm, updateTerm, deleteTerm } from "../services/term_service";
import type { BunRequest, Term } from "../schema";

export async function getTerms(req: Request) {
  await requireAuth(req);
  return Response.json(listTerms());
}

export async function postTerm(req: Request) {
  await requireAuth(req);
  const { name, slug } = await req.json() as { name: string; slug: string };
  if (!name?.trim() || !slug?.trim()) {
    return Response.json({ error: "name and slug are required" }, { status: 400 });
  }
  const term = createTerm(name.trim(), slug.trim());
  return Response.json(term, { status: 201 });
}

export async function putTerm(req: Request) {
  await requireAuth(req);
  const id = (req as BunRequest<{ id: string }>).params.id;
  const { name, slug, active } = await req.json() as Partial<Term>;
  updateTerm(id, { name, slug, active });
  return Response.json({ ok: true });
}

export async function deleteTerm_(req: Request) {
  await requireAuth(req);
  const id = (req as BunRequest<{ id: string }>).params.id;
  deleteTerm(id);
  return Response.json({ ok: true });
}
