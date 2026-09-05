import { requireAuth } from "../middleware";
import { db, getTemplate, requireTerm } from "../db";
import type { BunRequest, Applicant } from "../schema";
import { sendRegistrationEmail, sendReminderEmail, sendBroadcastEmail } from "../email";
import { fireWebhook } from "../services/webhook_caller";
import { logEmail } from "../services/email_log";

function countSettled(results: PromiseSettledResult<unknown>[]) {
  return {
    sent: results.filter(r => r.status === "fulfilled").length,
    failed: results.filter(r => r.status === "rejected").length,
  };
}

async function settledBatch(
  items: Applicant[],
  fn: (a: Applicant) => Promise<void>,
  concurrency = 5
): Promise<PromiseSettledResult<void>[]> {
  const results: PromiseSettledResult<void>[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    results.push(...await Promise.allSettled(items.slice(i, i + concurrency).map(fn)));
  }
  return results;
}

export const messagingRoutes = {
  "/api/terms/:id/broadcast": {
    async POST(req: Request) {
      await requireAuth(req);
      const termId = (req as BunRequest<{ id: string }>).params.id;
      requireTerm(termId);
      const { subject, body, filter } = await req.json() as { subject: string; body: string; filter: "all" | "paid" | "unpaid" };

      if (!subject?.trim() || !body?.trim()) {
        return Response.json({ error: "Subject and body are required" }, { status: 400 });
      }

      let whereClause = `term_id = ? AND email != ''`;
      if (filter === "paid") whereClause += ` AND paid = 1`;
      if (filter === "unpaid") whereClause += ` AND paid = 0`;

      const targets = db.prepare(
        `SELECT id, parent_name, email FROM applicants WHERE ${whereClause}`
      ).all(termId) as Pick<Applicant, "id" | "parent_name" | "email">[];

      const subjectTrimmed = subject.trim();
      const bodyTrimmed = body.trim();
      const results = await settledBatch(
        targets as Applicant[],
        a => sendBroadcastEmail(a.email, a.parent_name, subjectTrimmed, bodyTrimmed)
          .then(() => logEmail(a.id, "custom"))
      );
      const { sent, failed } = countSettled(results);
      return Response.json({ sent, failed });
    },
  },

  "/api/terms/:id/remind": {
    async POST(req: Request) {
      await requireAuth(req);
      const termId = (req as BunRequest<{ id: string }>).params.id;
      requireTerm(termId);
      const unpaid = db.prepare(
        `SELECT id, child_name, parent_name, email FROM applicants WHERE term_id = ? AND paid = 0 AND email != ''`
      ).all(termId) as Pick<Applicant, "id" | "child_name" | "parent_name" | "email">[];

      const tpl = getTemplate(termId, "reminder");
      const results = await settledBatch(
        unpaid as Applicant[],
        a => sendReminderEmail(a.email, a.parent_name, a.child_name, tpl)
          .then(() => { logEmail(a.id, "reminder"); fireWebhook(termId, "reminder", a); })
      );
      const { sent, failed } = countSettled(results);
      return Response.json({ sent, failed });
    },
  },

  "/api/terms/:id/applicants/:applicantId/registration-email": {
    async POST(req: Request) {
      await requireAuth(req);
      const { id: termId, applicantId } = (req as BunRequest<{ id: string; applicantId: string }>).params;
      const applicant = db.prepare(`SELECT * FROM applicants WHERE id = ?`).get(applicantId) as Applicant | undefined;
      if (!applicant) return Response.json({ error: "Not found" }, { status: 404 });
      const tpl = getTemplate(termId, "registration");
      await sendRegistrationEmail(applicant.email, applicant.parent_name, applicant.child_name, tpl);
      logEmail(applicant.id, "registration");
      return Response.json({ ok: true });
    },
  },

  "/api/terms/:id/applicants/:applicantId/remind": {
    async POST(req: Request) {
      await requireAuth(req);
      const { id: termId, applicantId } = (req as BunRequest<{ id: string; applicantId: string }>).params;
      const applicant = db.prepare(`SELECT * FROM applicants WHERE id = ?`).get(applicantId) as Applicant | undefined;
      if (!applicant) return Response.json({ error: "Not found" }, { status: 404 });
      if (applicant.paid) return Response.json({ error: "Already paid" }, { status: 400 });
      const tpl = getTemplate(termId, "reminder");
      await sendReminderEmail(applicant.email, applicant.parent_name, applicant.child_name, tpl);
      logEmail(applicant.id, "reminder");
      fireWebhook(termId, "reminder", applicant);
      return Response.json({ ok: true });
    },
  },
};
