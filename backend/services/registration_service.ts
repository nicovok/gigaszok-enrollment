import { db, getTemplate } from "../db";
import { sendRegistrationEmail } from "../email";
import { logEmail } from "./email_log";
import { fireWebhook } from "./webhook_caller";
import { randomUUID } from "crypto";
import type { Term, Applicant } from "../schema";

export interface RegistrationPayload {
  child_name: string;
  parent_name: string;
  email: string;
  form_data: unknown;
}

export function registerApplicant(term: Term, payload: RegistrationPayload): Applicant {
  const id = randomUUID();
  const form_data = payload.form_data != null ? JSON.stringify(payload.form_data) : null;

  db.prepare(`
    INSERT INTO applicants (id, term_id, child_name, parent_name, email, raw_json, paid, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(id, term.id, payload.child_name.trim(), payload.parent_name.trim(), payload.email.trim(), form_data, Date.now());

  const applicant = db.prepare(`SELECT * FROM applicants WHERE id = ?`).get(id) as Applicant;

  if (payload.form_data !== "IMPORT") {
    const tpl = getTemplate(term.id, "registration");
    sendRegistrationEmail(payload.email.trim(), payload.parent_name.trim(), payload.child_name.trim(), tpl)
      .then(() => logEmail(id, "registration"))
      .catch(err => console.error("[email] registration send failed:", err));
  }

  fireWebhook(term.id, "registration", applicant);

  return applicant;
}
