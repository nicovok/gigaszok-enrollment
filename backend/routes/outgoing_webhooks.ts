import { requireAuth } from "../middleware";
import { db } from "../db";
import type { BunRequest, OutgoingWebhook, WebhookEventType } from "../schema";
import { WEBHOOK_EVENTS } from "../schema";
import { randomUUID } from "crypto";

export const outgoingWebhookRoutes = {
  "/api/terms/:id/outgoing-webhooks": {
    async GET(req: Request) {
      await requireAuth(req);
      const termId = (req as BunRequest<{ id: string }>).params.id;

      const stored = db.prepare(`SELECT * FROM outgoing_webhooks WHERE term_id = ?`).all(termId) as OutgoingWebhook[];
      const byEvent = Object.fromEntries(stored.map(h => [h.event, h]));

      return Response.json(WEBHOOK_EVENTS.map(event => ({
        event,
        url: byEvent[event]?.url ?? "",
        auth_header: byEvent[event]?.auth_header ?? "",
      })));
    },
  },

  "/api/terms/:id/outgoing-webhooks/:event": {
    async PUT(req: Request) {
      await requireAuth(req);
      const { id: termId, event } = (req as BunRequest<{ id: string; event: string }>).params;

      if (!WEBHOOK_EVENTS.includes(event as WebhookEventType)) {
        return Response.json({ error: "Invalid event" }, { status: 400 });
      }

      const { url, auth_header } = await req.json() as { url: string; auth_header?: string | null };
      if (!url?.trim()) return Response.json({ error: "url is required" }, { status: 400 });

      const existing = db.prepare(`SELECT id FROM outgoing_webhooks WHERE term_id = ? AND event = ?`).get(termId, event) as { id: string } | null;

      if (existing) {
        db.prepare(`UPDATE outgoing_webhooks SET url = ?, auth_header = ? WHERE term_id = ? AND event = ?`)
          .run(url.trim(), auth_header?.trim() || null, termId, event);
      } else {
        db.prepare(`INSERT INTO outgoing_webhooks (id, term_id, event, url, auth_header, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
          .run(randomUUID(), termId, event, url.trim(), auth_header?.trim() || null, Date.now());
      }

      return Response.json({ ok: true });
    },

    async DELETE(req: Request) {
      await requireAuth(req);
      const { id: termId, event } = (req as BunRequest<{ id: string; event: string }>).params;
      db.prepare(`DELETE FROM outgoing_webhooks WHERE term_id = ? AND event = ?`).run(termId, event);
      return Response.json({ ok: true });
    },
  },
};
