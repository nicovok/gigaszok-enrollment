import { config } from "../config";
import { interp, renderBody, bankBox, template } from "./renderer";
import { getAssets, loadBanner } from "./assets";
import { transporter } from "./transport";
import { DEFAULT_TEMPLATES, type TplContent } from "./templates";

function buildAttachments(customBanner: Buffer | null) {
  const assets = getAssets();
  return [
    ...(customBanner
      ? [{ filename: "banner.png", content: customBanner, cid: "banner" }]
      : [{ filename: "logo.png", content: assets.logo, cid: "logo" }]),
    { filename: "footer.png", content: assets.footer, cid: "footer" },
  ];
}

async function sendTemplatedEmail(
  to: string,
  parentName: string,
  childName: string,
  type: keyof typeof DEFAULT_TEMPLATES,
  tpl?: TplContent,
  bankLines?: string[]
): Promise<void> {
  if (!to) return;
  const def = DEFAULT_TEMPLATES[type];
  const subject = interp(tpl?.subject ?? def.subject, childName, parentName);
  const box = bankLines ? bankBox(childName, bankLines) : undefined;
  const body = renderBody(tpl?.body ?? def.body, childName, parentName, box);
  const customBanner = await loadBanner(tpl?.banner_path);
  const html = template(`
    <p style="color:#1B2B6B;font-size:18px;font-weight:600;margin:0 0 16px;">Kedves ${parentName}!</p>
    ${body}
  `, !!customBanner);
  await transporter.sendMail({
    from: `"Gigászok" <${config.smtp.from}>`,
    to, subject, html,
    attachments: buildAttachments(customBanner),
  });
}

export function sendRegistrationEmail(
  to: string,
  parentName: string,
  childName: string,
  tpl?: TplContent
): Promise<void> {
  return sendTemplatedEmail(to, parentName, childName, "registration", tpl, [
    "<strong>Bankszámlaszám:</strong> 62100140 - 11035408 - 00000000",
    "<strong>Kedvezményezett:</strong> Gigászok Sportegyesület",
    `<strong>Közlemény:</strong> Támogatás - ${childName}`,
  ]);
}

export function sendReminderEmail(
  to: string,
  parentName: string,
  childName: string,
  tpl?: TplContent
): Promise<void> {
  return sendTemplatedEmail(to, parentName, childName, "reminder", tpl, [
    "<strong>Számlaszám:</strong> 62100140 - 11035408 - 00000000",
    `<strong>Közlemény:</strong> Adomány - ${childName}`,
    "<strong>Összeg:</strong> 5 000 Ft",
  ]);
}

export function sendPaymentConfirmationEmail(
  to: string,
  parentName: string,
  childName: string,
  tpl?: TplContent
): Promise<void> {
  return sendTemplatedEmail(to, parentName, childName, "payment_confirmation", tpl);
}

export async function sendBroadcastEmail(
  to: string,
  parentName: string,
  subject: string,
  body: string
): Promise<void> {
  if (!to) return;
  const bodyHtml = body
    .split("\n")
    .map(line => line.trim() === "" ? "<br/>" : `<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 12px;">${line}</p>`)
    .join("\n");

  const html = template(`
    <p style="color:#1B2B6B;font-size:18px;font-weight:600;margin:0 0 16px;">Kedves ${parentName}!</p>
    ${bodyHtml}
  `, false);

  const assets = getAssets();
  await transporter.sendMail({
    from: `"Gigászok" <${config.smtp.from}>`,
    to, subject, html,
    attachments: [
      { filename: "logo.png", content: assets.logo, cid: "logo" },
      { filename: "footer.png", content: assets.footer, cid: "footer" },
    ],
  });
}
