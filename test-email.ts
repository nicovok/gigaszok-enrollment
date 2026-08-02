import { sendPaymentConfirmationEmail } from "./backend/email";

const to = process.argv[2];
if (!to) {
  console.error("Usage: bun test-email.ts <email>");
  process.exit(1);
}

console.log("Sending to:", to);
await sendPaymentConfirmationEmail(to, "Kovács János", "Kovács Péter");
console.log("Done.");
