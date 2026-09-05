import { requireAuth } from "../middleware";
import type { BunRequest, WebhookEventType } from "../schema";
import { WEBHOOK_EVENTS } from "../schema";
import { listOutgoingWebhooks, upsertOutgoingWebhook, deleteOutgoingWebhook } from "../services/outgoing_webhook_service";

export async function getOutgoingWebhooks(req: Request) {
  await requireAuth(req);
  const termId = (req as BunRequest<{ id: string }>).params.id;
  return Response.json(listOutgoingWebhooks(termId));
}

export async function putOutgoingWebhook(req: Request) {
  await requireAuth(req);
  const { id: termId, event } = (req as BunRequest<{ id: string; event: string }>).params;

  if (!WEBHOOK_EVENTS.includes(event as WebhookEventType)) {
    return Response.json({ error: "Invalid event" }, { status: 400 });
  }

  const { url, auth_header } = await req.json() as { url: string; auth_header?: string | null };
  if (!url?.trim()) return Response.json({ error: "url is required" }, { status: 400 });

  upsertOutgoingWebhook(termId, event as WebhookEventType, url.trim(), auth_header?.trim() || null);
  return Response.json({ ok: true });
}

export async function deleteOutgoingWebhook_(req: Request) {
  await requireAuth(req);
  const { id: termId, event } = (req as BunRequest<{ id: string; event: string }>).params;
  deleteOutgoingWebhook(termId, event);
  return Response.json({ ok: true });
}
