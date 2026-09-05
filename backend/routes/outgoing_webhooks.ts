import { getOutgoingWebhooks, putOutgoingWebhook, deleteOutgoingWebhook_ } from "../controllers/outgoing_webhook_controller";

export const outgoingWebhookRoutes = {
  "/api/terms/:id/outgoing-webhooks": { GET: getOutgoingWebhooks },
  "/api/terms/:id/outgoing-webhooks/:event": { PUT: putOutgoingWebhook, DELETE: deleteOutgoingWebhook_ },
};
