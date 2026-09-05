import { postWebhook } from "../controllers/registration_controller";

export const webhookRoutes = {
  "/webhooks/:slug": { POST: postWebhook },
};
