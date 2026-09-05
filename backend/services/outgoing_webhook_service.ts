import { db } from "../db";
import { randomUUID } from "crypto";
import type { OutgoingWebhook, WebhookEventType } from "../schema";
import { WEBHOOK_EVENTS } from "../schema";

export function listOutgoingWebhooks(termId: string) {
  const stored = db.prepare(`SELECT * FROM outgoing_webhooks WHERE term_id = ?`).all(termId) as OutgoingWebhook[];
  const byEvent = Object.fromEntries(stored.map(h => [h.event, h]));

  return WEBHOOK_EVENTS.map(event => ({
    event,
    url: byEvent[event]?.url ?? "",
    auth_header: byEvent[event]?.auth_header ?? "",
  }));
}

export function upsertOutgoingWebhook(termId: string, event: WebhookEventType, url: string, auth_header: string | null) {
  const existing = db.prepare(`SELECT id FROM outgoing_webhooks WHERE term_id = ? AND event = ?`).get(termId, event) as { id: string } | null;

  if (existing) {
    db.prepare(`UPDATE outgoing_webhooks SET url = ?, auth_header = ? WHERE term_id = ? AND event = ?`)
      .run(url, auth_header, termId, event);
  } else {
    db.prepare(`INSERT INTO outgoing_webhooks (id, term_id, event, url, auth_header, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), termId, event, url, auth_header, Date.now());
  }
}

export function deleteOutgoingWebhook(termId: string, event: string) {
  db.prepare(`DELETE FROM outgoing_webhooks WHERE term_id = ? AND event = ?`).run(termId, event);
}
