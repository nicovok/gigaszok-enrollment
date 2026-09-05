import { db } from "../db";
import { NotFoundError } from "../errors";
import { handlePaymentConfirmed } from "./payment_service";
import type { Applicant, EmailLog } from "../schema";

export function listApplicants(termId: string): Omit<Applicant, "raw_json">[] {
  return db.prepare(
    `SELECT id, term_id, child_name, parent_name, email, paid, created_at FROM applicants WHERE term_id = ? ORDER BY created_at DESC`
  ).all(termId) as Omit<Applicant, "raw_json">[];
}

export function getApplicant(id: string, termId: string): Applicant {
  const applicant = db.prepare(`SELECT * FROM applicants WHERE id = ? AND term_id = ?`).get(id, termId) as Applicant | null;
  if (!applicant) throw new NotFoundError("Applicant not found");
  return applicant;
}

export function deleteApplicant(id: string, termId: string): void {
  db.prepare(`DELETE FROM email_logs WHERE applicant_id = ?`).run(id);
  db.prepare(`DELETE FROM applicants WHERE id = ? AND term_id = ?`).run(id, termId);
}

export function setApplicantPaid(id: string, termId: string, paid: boolean): void {
  db.prepare(`UPDATE applicants SET paid = ? WHERE id = ? AND term_id = ?`)
    .run(paid ? 1 : 0, id, termId);
  if (paid) {
    const applicant = db.prepare(`SELECT * FROM applicants WHERE id = ?`).get(id) as Applicant | null;
    if (applicant) handlePaymentConfirmed(termId, applicant);
  }
}

export function getEmailLog(applicantId: string): EmailLog[] {
  return db.prepare(
    `SELECT * FROM email_logs WHERE applicant_id = ? ORDER BY sent_at DESC`
  ).all(applicantId) as EmailLog[];
}
