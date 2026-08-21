import { requireAuth } from "../middleware";
import { db, getTemplate } from "../db";
import type { BunRequest, Applicant, EmailLog, CSVResult } from "../schema";
import { sendRegistrationEmail, sendPaymentConfirmationEmail, sendReminderEmail, sendBroadcastEmail } from "../email";
import { fireWebhook } from "../webhook_caller";
import { parseCSV, isAmount5000 } from "../csv";
import { logEmail } from "../email_log";

function handlePaymentConfirmed(termId: string, applicant: Applicant): void {
  const tpl = getTemplate(termId, "payment_confirmation");
  sendPaymentConfirmationEmail(applicant.email, applicant.parent_name, applicant.child_name, tpl)
    .then(() => logEmail(applicant.id, "payment_confirmation"))
    .catch(err => console.error("[email] payment confirmation send failed:", err));
  fireWebhook(termId, "payment", applicant);
}

function countSettled(results: PromiseSettledResult<unknown>[]) {
  return {
    sent: results.filter(r => r.status === "fulfilled").length,
    failed: results.filter(r => r.status === "rejected").length,
  };
}

export const applicantRoutes = {
  "/api/terms/:id/applicants": {
    async GET(req: Request) {
      await requireAuth(req);
      const termId = (req as BunRequest<{ id: string }>).params.id;
      const applicants = db.prepare(
        `SELECT * FROM applicants WHERE term_id = ? ORDER BY created_at DESC`
      ).all(termId) as Applicant[];
      return Response.json(applicants);
    },
  },

  "/api/terms/:id/applicants/:applicantId": {
    async DELETE(req: Request) {
      await requireAuth(req);
      const { id: termId, applicantId } = (req as BunRequest<{ id: string; applicantId: string }>).params;
      db.prepare(`DELETE FROM email_logs WHERE applicant_id = ?`).run(applicantId);
      db.prepare(`DELETE FROM applicants WHERE id = ? AND term_id = ?`).run(applicantId, termId);
      return Response.json({ ok: true });
    },
  },

  "/api/terms/:id/applicants/:applicantId/paid": {
    async PUT(req: Request) {
      await requireAuth(req);
      const { id: termId, applicantId } = (req as BunRequest<{ id: string; applicantId: string }>).params;
      const { paid } = await req.json() as { paid: boolean };
      db.prepare(`UPDATE applicants SET paid = ? WHERE id = ? AND term_id = ?`)
        .run(paid ? 1 : 0, applicantId, termId);
      if (paid) {
        const applicant = db.prepare(`SELECT * FROM applicants WHERE id = ?`).get(applicantId) as Applicant;
        if (applicant) handlePaymentConfirmed(termId, applicant);
      }
      return Response.json({ ok: true });
    },
  },

  "/api/terms/:id/broadcast": {
    async POST(req: Request) {
      await requireAuth(req);
      const termId = (req as BunRequest<{ id: string }>).params.id;
      const { subject, body, filter } = await req.json() as { subject: string; body: string; filter: "all" | "paid" | "unpaid" };

      if (!subject?.trim() || !body?.trim()) {
        return Response.json({ error: "Subject and body are required" }, { status: 400 });
      }

      let whereClause = `term_id = ? AND email != ''`;
      if (filter === "paid") whereClause += ` AND paid = 1`;
      if (filter === "unpaid") whereClause += ` AND paid = 0`;

      const targets = db.prepare(`SELECT * FROM applicants WHERE ${whereClause}`).all(termId) as Applicant[];

      const results = await Promise.allSettled(
        targets.map(a =>
          sendBroadcastEmail(a.email, a.parent_name, subject.trim(), body.trim())
            .then(() => logEmail(a.id, "custom"))
        )
      );
      const { sent, failed } = countSettled(results);
      return Response.json({ sent, failed });
    },
  },

  "/api/terms/:id/remind": {
    async POST(req: Request) {
      await requireAuth(req);
      const termId = (req as BunRequest<{ id: string }>).params.id;
      const unpaid = db.prepare(
        `SELECT * FROM applicants WHERE term_id = ? AND paid = 0 AND email != ''`
      ).all(termId) as Applicant[];

      const tpl = getTemplate(termId, "reminder");
      const results = await Promise.allSettled(
        unpaid.map(a =>
          sendReminderEmail(a.email, a.parent_name, a.child_name, tpl)
            .then(() => { logEmail(a.id, "reminder"); fireWebhook(termId, "reminder", a); })
        )
      );
      const { sent, failed } = countSettled(results);
      return Response.json({ sent, failed });
    },
  },

  "/api/terms/:id/applicants/:applicantId/registration-email": {
    async POST(req: Request) {
      await requireAuth(req);
      const { applicantId } = (req as BunRequest<{ id: string; applicantId: string }>).params;
      const applicant = db.prepare(`SELECT * FROM applicants WHERE id = ?`).get(applicantId) as Applicant | undefined;
      if (!applicant) return Response.json({ error: "Not found" }, { status: 404 });
      const tpl = getTemplate((req as BunRequest<{ id: string; applicantId: string }>).params.id, "registration");
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
      const reminderTpl = getTemplate(termId, "reminder");
      await sendReminderEmail(applicant.email, applicant.parent_name, applicant.child_name, reminderTpl);
      logEmail(applicant.id, "reminder");
      fireWebhook(termId, "reminder", applicant);
      return Response.json({ ok: true });
    },
  },

  "/api/terms/:id/applicants/:applicantId/email-log": {
    async GET(req: Request) {
      await requireAuth(req);
      const { applicantId } = (req as BunRequest<{ id: string; applicantId: string }>).params;
      const logs = db.prepare(
        `SELECT * FROM email_logs WHERE applicant_id = ? ORDER BY sent_at DESC`
      ).all(applicantId) as EmailLog[];
      return Response.json(logs);
    },
  },

  "/api/terms/:id/csv": {
    async POST(req: Request) {
      await requireAuth(req);
      const termId = (req as BunRequest<{ id: string }>).params.id;

      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return Response.json({ error: "No file uploaded" }, { status: 400 });

      const text = await file.text();
      const rows = parseCSV(text);

      const applicants = db.prepare(
        `SELECT * FROM applicants WHERE term_id = ?`
      ).all(termId) as Applicant[];

      const result: CSVResult = { matched: 0, updated: 0, already_paid: 0 };

      for (const applicant of applicants) {
        const pattern = `adomány - ${applicant.child_name.toLowerCase().trim()}`;
        for (const row of rows) {
          const hasDescription = row.some(cell => cell.toLowerCase().trim() === pattern);
          const hasAmount = row.some(cell => isAmount5000(cell));
          if (hasDescription && hasAmount) {
            result.matched++;
            if (applicant.paid) {
              result.already_paid++;
            } else {
              db.prepare(`UPDATE applicants SET paid = 1 WHERE id = ?`).run(applicant.id);
              result.updated++;
              applicant.paid = 1;
              handlePaymentConfirmed(termId, applicant);
            }
            break;
          }
        }
      }

      return Response.json(result);
    },
  },
};
