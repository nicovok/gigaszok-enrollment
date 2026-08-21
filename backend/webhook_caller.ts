import { db } from "./db";
import type { Applicant, WebhookEventType } from "./schema";

type HookRow = { url: string; auth_header: string | null };

export function fireWebhook(termId: string, event: WebhookEventType, applicant: Applicant): void {
  const hook = db.prepare(`SELECT url, auth_header FROM outgoing_webhooks WHERE term_id = ? AND event = ?`)
    .get(termId, event) as HookRow | null;

  if (!hook?.url) return;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (hook.auth_header) headers["Authorization"] = hook.auth_header;

  const payload = {
    event,
    term_id: termId,
    applicant: {
      id: applicant.id,
      child_name: applicant.child_name,
      parent_name: applicant.parent_name,
      email: applicant.email,
      paid: applicant.paid,
      created_at: applicant.created_at,
    },
    timestamp: Date.now(),
  };

  fetch(hook.url, { method: "POST", headers, body: JSON.stringify(payload) })
    .then(res => { if (!res.ok) console.error(`[webhook] ${event} → HTTP ${res.status}`); })
    .catch(err => console.error(`[webhook] ${event} error:`, err));
}
