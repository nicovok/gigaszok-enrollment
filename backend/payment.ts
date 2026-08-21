import { getTemplate } from "./db";
import { sendPaymentConfirmationEmail } from "./email";
import { logEmail } from "./email_log";
import { fireWebhook } from "./webhook_caller";
import type { Applicant } from "./schema";

export function handlePaymentConfirmed(termId: string, applicant: Applicant): void {
  const tpl = getTemplate(termId, "payment_confirmation");
  sendPaymentConfirmationEmail(applicant.email, applicant.parent_name, applicant.child_name, tpl)
    .then(() => logEmail(applicant.id, "payment_confirmation"))
    .catch(err => console.error("[email] payment confirmation send failed:", err));
  fireWebhook(termId, "payment", applicant);
}
