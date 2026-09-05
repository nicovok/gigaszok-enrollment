import { postBroadcast, postRemind, postResendRegistrationEmail, postRemindApplicant } from "../controllers/messaging_controller";

export const messagingRoutes = {
  "/api/terms/:id/broadcast": { POST: postBroadcast },
  "/api/terms/:id/remind": { POST: postRemind },
  "/api/terms/:id/applicants/:applicantId/registration-email": { POST: postResendRegistrationEmail },
  "/api/terms/:id/applicants/:applicantId/remind": { POST: postRemindApplicant },
};
