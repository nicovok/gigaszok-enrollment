import { db, getTemplate } from "../db";
import type { BunRequest, Term, Applicant } from "../schema";
import { randomUUID } from "crypto";
import { sendRegistrationEmail } from "../email";
import { logEmail } from "../email_log";
import { fireWebhook } from "../webhook_caller";

export const webhookRoutes = {
  "/webhooks/:slug": {
    async POST(req: Request) {
      const slug = (req as BunRequest<{ slug: string }>).params.slug;

      const term = db.prepare(`SELECT * FROM terms WHERE slug = ? AND active = 1`).get(slug) as Term | undefined;
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

      const id = randomUUID();
      const form_data = body.form_data != null ? JSON.stringify(body.form_data) : null;
      db.prepare(`
        INSERT INTO applicants (id, term_id, child_name, parent_name, email, raw_json, paid, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `).run(id, term.id, child_name.trim(), parent_name.trim(), email.trim(), form_data, Date.now());

      const newApplicant = db.prepare(`SELECT * FROM applicants WHERE id = ?`).get(id) as Applicant;

      if (body.form_data !== "IMPORT") {
        const tpl = getTemplate(term.id, "registration");
        sendRegistrationEmail(email.trim(), parent_name.trim(), child_name.trim(), tpl)
          .then(() => logEmail(id, "registration"))
          .catch(err => console.error("[email] registration send failed:", err));
      }

      if (newApplicant) fireWebhook(term.id, "registration", newApplicant);

      return Response.json({ ok: true, id }, { status: 201 });
    },
  },
};
