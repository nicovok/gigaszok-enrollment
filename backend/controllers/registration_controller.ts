import { findTermBySlug } from "../services/term_service";
import { registerApplicant } from "../services/registration_service";
import type { BunRequest } from "../schema";

export async function postWebhook(req: Request) {
  const slug = (req as BunRequest<{ slug: string }>).params.slug;

  const term = findTermBySlug(slug);
  if (!term) return Response.json({ error: "Unknown or inactive term" }, { status: 404 });

  const secret = req.headers.get("X-Webhook-Secret");
  if (!secret || secret !== term.webhook_secret) {
    return Response.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const child_name = body.child_name;
  const parent_name = body.parent_name ?? "";
  const email = body.email ?? "";

  if (typeof child_name !== "string" || !child_name.trim()) {
    return Response.json({ error: "child_name must be a non-empty string" }, { status: 400 });
  }
  if (typeof parent_name !== "string") {
    return Response.json({ error: "parent_name must be a string" }, { status: 400 });
  }
  if (typeof email !== "string") {
    return Response.json({ error: "email must be a string" }, { status: 400 });
  }

  const applicant = registerApplicant(term, {
    child_name,
    parent_name,
    email,
    form_data: body.form_data,
  });

  return Response.json({ ok: true, id: applicant.id }, { status: 201 });
}
