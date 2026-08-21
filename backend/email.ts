import nodemailer from "nodemailer";
import { config } from "./config";
// @ts-ignore
import bannerPath from "./email-banner.png" with { type: "file" };
// @ts-ignore
import footerPath from "./email-footer.png" with { type: "file" };
// @ts-ignore
import logoPath from "./email-logo.png" with { type: "file" };

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: false,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

async function loadAssets() {
  return {
    banner: Buffer.from(await Bun.file(bannerPath).arrayBuffer()),
    footer: Buffer.from(await Bun.file(footerPath).arrayBuffer()),
    logo: Buffer.from(await Bun.file(logoPath).arrayBuffer()),
  };
}

let assets: Awaited<ReturnType<typeof loadAssets>>;

export async function initEmailAssets() {
  assets = await loadAssets();
}

export type TplContent = {
  subject?: string | null;
  body?: string | null;
  banner_path?: string | null;
};

export const DEFAULT_TEMPLATES = {
  registration: {
    subject: "Beiratkozási jelentkezés beérkezett – {child_name}",
    body: "Köszönjük jelentkezésed az adott tanévre a Gigászok Sportegyesület úszó szakosztályába.\nJelentkezésed egy 5.000 Ft-os szakosztályi hozzájárulással tudod megerősíteni, amely természetesen a szeptemberi szakosztályi hozzájárulásból jóváírásra kerül.\n\n{bank_adatok}\n\nA regisztráció megerősítésére azért van szükség, mert csoportjaink évről évre túltelítettek, és ezúton szeretnénk helyet biztosítani a valóban motivált és elkötelezett jelentkezőknek.\nA tanévvel kapcsolatos további információkat erre az e-mail címre fogod megkapni. Csobbanj velünk szeptemberben!",
  },
  reminder: {
    subject: "Emlékeztető: beiratkozási díj – {child_name}",
    body: "Emlékeztetőül jelezzük, hogy {child_name} beiratkozása még nem véglegesített, mivel az 5 000 Ft-os szakosztályi hozzájárulás még nem érkezett meg.\nKérjük, utald el az összeget az alábbi adatokkal:\n\n{bank_adatok}\n\nHa már átutaltad, kérjük hagyd figyelmen kívül ezt az üzenetet!\nAmennyiben vissza szeretnéd vonni a jelentkezést, kérjük jelezd az alábbi elérhetőségek egyikén.",
  },
  payment_confirmation: {
    subject: "Beiratkozás megerősítve – {child_name}",
    body: "Örömmel értesítünk, hogy {child_name} beiratkozási díja (5 000 Ft) megérkezett!\nA beiratkozás <strong>visszaigazolva</strong>. Az 5 000 Ft az első havidíjba kerül beszámításra.\nVárunk szeptemberben úszni! 🏊",
  },
} as const;

function interp(text: string, childName: string, parentName: string): string {
  return text.replace(/\{child_name\}/g, childName).replace(/\{parent_name\}/g, parentName);
}

function renderBody(text: string, childName: string, parentName: string, box?: string): string {
  return text
    .split("\n")
    .map(line => {
      if (box && line.trim() === "{bank_adatok}") return box;
      if (line.trim() === "") return "<br/>";
      return `<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 12px;">${interp(line, childName, parentName)}</p>`;
    })
    .join("\n");
}

async function loadBanner(bannerPath: string | null | undefined): Promise<Buffer | null> {
  if (!bannerPath) return null;
  try {
    const f = Bun.file(bannerPath);
    if (await f.exists()) return Buffer.from(await f.arrayBuffer());
  } catch {}
  return null;
}

function template(body: string, hasBanner: boolean): string {
  const headerRow = hasBanner
    ? `<tr><td><img src="cid:banner" width="600" style="display:block;width:100%;max-width:600px;" /></td></tr>`
    : `<tr><td bgcolor="#2C39A2" style="background:#2C39A2;padding:24px 40px;text-align:center;">
        <img src="cid:logo" width="100" style="display:inline-block;width:100px;" />
       </td></tr>`;
  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        ${headerRow}
        <tr><td style="padding:32px 40px 40px;">
          ${body}
          <p style="margin:24px 0 0;color:#333;font-size:15px;line-height:1.6;">
            Üdv,<br/>A Gigászok csapata
          </p>
        </td></tr>
        <tr><td>
          <img src="cid:footer" width="600" style="display:block;width:100%;max-width:600px;" />
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function bankBox(childName: string, rows: string[]): string {
  const rowsHtml = rows
    .map(r => `<tr><td style="color:#1B2B6B;font-size:14px;padding:4px 0;">${r}</td></tr>`)
    .join("\n");
  return `<table style="background:#f0f4ff;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;box-sizing:border-box;">${rowsHtml}</table>`;
}

export async function sendRegistrationEmail(
  to: string,
  parentName: string,
  childName: string,
  tpl?: TplContent
): Promise<void> {
  if (!to) return;
  const def = DEFAULT_TEMPLATES.registration;
  const subject = interp(tpl?.subject ?? def.subject, childName, parentName);
  const box = bankBox(childName, [
    "<strong>Bankszámlaszám:</strong> 62100140 - 11035408 - 00000000",
    "<strong>Kedvezményezett:</strong> Gigászok Sportegyesület",
    `<strong>Közlemény:</strong> Támogatás - ${childName}`,
  ]);
  const body = renderBody(tpl?.body ?? def.body, childName, parentName, box);

  const customBanner = await loadBanner(tpl?.banner_path);
  const html = template(`
    <p style="color:#1B2B6B;font-size:18px;font-weight:600;margin:0 0 16px;">Kedves ${parentName}!</p>
    ${body}
  `, !!customBanner);

  await transporter.sendMail({
    from: `"Gigászok" <${config.smtp.from}>`,
    to,
    subject,
    html,
    attachments: [
      ...(customBanner
        ? [{ filename: "banner.png", content: customBanner, cid: "banner" }]
        : [{ filename: "logo.png", content: assets.logo, cid: "logo" }]),
      { filename: "footer.png", content: assets.footer, cid: "footer" },
    ],
  });
}

export async function sendReminderEmail(
  to: string,
  parentName: string,
  childName: string,
  tpl?: TplContent
): Promise<void> {
  if (!to) return;
  const def = DEFAULT_TEMPLATES.reminder;
  const subject = interp(tpl?.subject ?? def.subject, childName, parentName);
  const box = bankBox(childName, [
    "<strong>Számlaszám:</strong> 62100140 - 11035408 - 00000000",
    `<strong>Közlemény:</strong> Adomány - ${childName}`,
    "<strong>Összeg:</strong> 5 000 Ft",
  ]);
  const body = renderBody(tpl?.body ?? def.body, childName, parentName, box);

  const customBanner = await loadBanner(tpl?.banner_path);
  const html = template(`
    <p style="color:#1B2B6B;font-size:18px;font-weight:600;margin:0 0 16px;">Kedves ${parentName}!</p>
    ${body}
  `, !!customBanner);

  await transporter.sendMail({
    from: `"Gigászok" <${config.smtp.from}>`,
    to,
    subject,
    html,
    attachments: [
      ...(customBanner
        ? [{ filename: "banner.png", content: customBanner, cid: "banner" }]
        : [{ filename: "logo.png", content: assets.logo, cid: "logo" }]),
      { filename: "footer.png", content: assets.footer, cid: "footer" },
    ],
  });
}

export async function sendPaymentConfirmationEmail(
  to: string,
  parentName: string,
  childName: string,
  tpl?: TplContent
): Promise<void> {
  if (!to) return;
  const def = DEFAULT_TEMPLATES.payment_confirmation;
  const subject = interp(tpl?.subject ?? def.subject, childName, parentName);
  const body = renderBody(tpl?.body ?? def.body, childName, parentName);

  const customBanner = await loadBanner(tpl?.banner_path);
  const html = template(`
    <p style="color:#1B2B6B;font-size:18px;font-weight:600;margin:0 0 16px;">Kedves ${parentName}!</p>
    ${body}
  `, !!customBanner);

  await transporter.sendMail({
    from: `"Gigászok" <${config.smtp.from}>`,
    to,
    subject,
    html,
    attachments: [
      ...(customBanner
        ? [{ filename: "banner.png", content: customBanner, cid: "banner" }]
        : [{ filename: "logo.png", content: assets.logo, cid: "logo" }]),
      { filename: "footer.png", content: assets.footer, cid: "footer" },
    ],
  });
}

export async function sendBroadcastEmail(to: string, parentName: string, subject: string, body: string): Promise<void> {
  if (!to) return;
  const bodyHtml = body
    .split("\n")
    .map(line => line.trim() === "" ? "<br/>" : `<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 12px;">${line}</p>`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td bgcolor="#2C39A2" style="background:#2C39A2;padding:24px 40px;text-align:center;">
            <img src="cid:logo" width="100" style="display:inline-block;width:100px;" />
          </td>
        </tr>
        <tr>
          <td bgcolor="#ffffff" style="background:#ffffff;padding:24px 40px 40px;">
            <p style="color:#1B2B6B;font-size:18px;font-weight:600;margin:0 0 16px;">Kedves ${parentName}!</p>
            ${bodyHtml}
            <p style="margin:24px 0 0;color:#333;font-size:15px;line-height:1.6;">
              Üdv,<br/>A Gigászok csapata
            </p>
          </td>
        </tr>
        <tr><td>
          <img src="cid:footer" width="600" style="display:block;width:100%;max-width:600px;" />
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Gigászok" <${config.smtp.from}>`,
    to,
    subject,
    html,
    attachments: [
      { filename: "logo.png", content: assets.logo, cid: "logo" },
      { filename: "footer.png", content: assets.footer, cid: "footer" },
    ],
  });
}
