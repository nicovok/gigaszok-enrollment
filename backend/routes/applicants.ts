import { requireAuth } from "../middleware";
import { db } from "../db";
import type { BunRequest, Applicant, EmailLog, CSVResult } from "../schema";
import { sendPaymentConfirmationEmail, sendReminderEmail } from "../email";
import { randomUUID } from "crypto";

function logEmail(applicant_id: string, type: EmailLog["type"]) {
  db.prepare(`INSERT INTO email_logs (id, applicant_id, type, sent_at) VALUES (?, ?, ?, ?)`)
    .run(randomUUID(), applicant_id, type, Date.now());
}

function parseCSV(text: string): string[][] {
  const firstLine = text.split("\n")[0] ?? "";
  const sep = (firstLine.match(/;/g) ?? []).length > (firstLine.match(/,/g) ?? []).length ? ";" : ",";

  return text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => splitLine(line, sep));
}

function splitLine(line: string, sep: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === sep && !inQuotes) {
      cells.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim().replace(/^"|"$/g, ""));
  return cells;
}

function isAmount5000(cell: string): boolean {
  // handles "5000", "5 000", "5000.00", "5 000,00", "5000,00"
  const normalized = cell.replace(/\s/g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  return parseFloat(normalized) === 5000;
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
      console.log("[paid] applicantId:", applicantId, "paid:", paid);
      db.prepare(`UPDATE applicants SET paid = ? WHERE id = ? AND term_id = ?`)
        .run(paid ? 1 : 0, applicantId, termId);
      if (paid) {
        const applicant = db.prepare(`SELECT * FROM applicants WHERE id = ?`).get(applicantId) as Applicant;
        if (applicant) {
          sendPaymentConfirmationEmail(applicant.email, applicant.parent_name, applicant.child_name)
            .then(() => logEmail(applicant.id, "payment_confirmation"))
            .catch(err => console.error("[email] failed:", err));
        }
      }
      return Response.json({ ok: true });
    },
  },

  "/api/terms/:id/remind": {
    async POST(req: Request) {
      await requireAuth(req);
      const termId = (req as BunRequest<{ id: string }>).params.id;
      const unpaid = db.prepare(
        `SELECT * FROM applicants WHERE term_id = ? AND paid = 0 AND email != ''`
      ).all(termId) as Applicant[];

      const results = await Promise.allSettled(
        unpaid.map(a =>
          sendReminderEmail(a.email, a.parent_name, a.child_name)
            .then(() => logEmail(a.id, "reminder"))
        )
      );
      const sent = results.filter(r => r.status === "fulfilled").length;
      const failed = results.filter(r => r.status === "rejected").length;
      return Response.json({ sent, failed });
    },
  },

  "/api/terms/:id/applicants/:applicantId/remind": {
    async POST(req: Request) {
      await requireAuth(req);
      const { applicantId } = (req as BunRequest<{ id: string; applicantId: string }>).params;
      const applicant = db.prepare(`SELECT * FROM applicants WHERE id = ?`).get(applicantId) as Applicant | undefined;
      if (!applicant) return Response.json({ error: "Not found" }, { status: 404 });
      if (applicant.paid) return Response.json({ error: "Already paid" }, { status: 400 });
      await sendReminderEmail(applicant.email, applicant.parent_name, applicant.child_name);
      logEmail(applicant.id, "reminder");
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
              sendPaymentConfirmationEmail(applicant.email, applicant.parent_name, applicant.child_name)
                .then(() => logEmail(applicant.id, "payment_confirmation"))
                .catch(err => console.error("[email] payment confirmation send failed:", err));
            }
            break;
          }
        }
      }

      return Response.json(result);
    },
  },
};
