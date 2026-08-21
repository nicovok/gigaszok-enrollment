import { db } from "./db";
import { randomUUID } from "crypto";
import type { EmailLog } from "./schema";

export function logEmail(applicantId: string, type: EmailLog["type"]): void {
  db.prepare(`INSERT INTO email_logs (id, applicant_id, type, sent_at) VALUES (?, ?, ?, ?)`)
    .run(randomUUID(), applicantId, type, Date.now());
}
