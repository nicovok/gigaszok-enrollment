import { requireAuth } from "../middleware";
import { db, requireTerm } from "../db";
import type { BunRequest, Applicant, EmailLog } from "../schema";
import { handlePaymentConfirmed } from "../payment";

export const applicantRoutes = {
  "/api/terms/:id/applicants": {
    async GET(req: Request) {
      await requireAuth(req);
      const termId = (req as BunRequest<{ id: string }>).params.id;
      requireTerm(termId);
      const applicants = db.prepare(
        `SELECT id, term_id, child_name, parent_name, email, paid, created_at FROM applicants WHERE term_id = ? ORDER BY created_at DESC`
      ).all(termId) as Omit<Applicant, "raw_json">[];
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
};
