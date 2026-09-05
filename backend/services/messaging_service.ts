import { db, getTemplate } from "../db";
import { sendRegistrationEmail, sendReminderEmail, sendBroadcastEmail } from "../email";
import { logEmail } from "./email_log";
import { fireWebhook } from "./webhook_caller";
import { NotFoundError, ValidationError } from "../errors";
import type { Applicant } from "../schema";

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

export async function broadcastMessage(
  termId: string,
  subject: string,
  body: string,
  filter: "all" | "paid" | "unpaid"
): Promise<{ sent: number; failed: number }> {
  let whereClause = `term_id = ? AND email != ''`;
  if (filter === "paid") whereClause += ` AND paid = 1`;
  if (filter === "unpaid") whereClause += ` AND paid = 0`;

  const targets = db.prepare(
    `SELECT id, parent_name, email FROM applicants WHERE ${whereClause}`
  ).all(termId) as Pick<Applicant, "id" | "parent_name" | "email">[];

  const results = await settledBatch(
    targets as Applicant[],
    a => sendBroadcastEmail(a.email, a.parent_name, subject, body)
      .then(() => logEmail(a.id, "custom"))
  );
  return countSettled(results);
}

export async function remindUnpaid(termId: string): Promise<{ sent: number; failed: number }> {
  const unpaid = db.prepare(
    `SELECT id, child_name, parent_name, email FROM applicants WHERE term_id = ? AND paid = 0 AND email != ''`
  ).all(termId) as Pick<Applicant, "id" | "child_name" | "parent_name" | "email">[];

  const tpl = getTemplate(termId, "reminder");
  const results = await settledBatch(
    unpaid as Applicant[],
    a => sendReminderEmail(a.email, a.parent_name, a.child_name, tpl)
      .then(() => { logEmail(a.id, "reminder"); fireWebhook(termId, "reminder", a as Applicant); })
  );
  return countSettled(results);
}

export async function resendRegistrationEmail(termId: string, applicantId: string): Promise<void> {
  const applicant = db.prepare(`SELECT * FROM applicants WHERE id = ?`).get(applicantId) as Applicant | null;
  if (!applicant) throw new NotFoundError("Applicant not found");
  const tpl = getTemplate(termId, "registration");
  await sendRegistrationEmail(applicant.email, applicant.parent_name, applicant.child_name, tpl);
  logEmail(applicant.id, "registration");
}

export async function remindApplicant(termId: string, applicantId: string): Promise<void> {
  const applicant = db.prepare(`SELECT * FROM applicants WHERE id = ?`).get(applicantId) as Applicant | null;
  if (!applicant) throw new NotFoundError("Applicant not found");
  if (applicant.paid) throw new ValidationError("Already paid");
  const tpl = getTemplate(termId, "reminder");
  await sendReminderEmail(applicant.email, applicant.parent_name, applicant.child_name, tpl);
  logEmail(applicant.id, "reminder");
  fireWebhook(termId, "reminder", applicant);
}
