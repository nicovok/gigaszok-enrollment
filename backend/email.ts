import nodemailer from "nodemailer";
import { config } from "./config";
// @ts-ignore
import bannerPath from "./email-banner.png" with { type: "file" };
// @ts-ignore
import reminderBannerPath from "./email-reminder-banner.png" with { type: "file" };
// @ts-ignore
import registrationBannerPath from "./email-registration-banner.png" with { type: "file" };
// @ts-ignore
import footerPath from "./email-footer.png" with { type: "file" };

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: false,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

async function loadAssets() {
  return {
    banner: Buffer.from(await Bun.file(bannerPath).arrayBuffer()),
    reminderBanner: Buffer.from(await Bun.file(reminderBannerPath).arrayBuffer()),
    registrationBanner: Buffer.from(await Bun.file(registrationBannerPath).arrayBuffer()),
    footer: Buffer.from(await Bun.file(footerPath).arrayBuffer()),
  };
}

let assets: Awaited<ReturnType<typeof loadAssets>>;

export async function initEmailAssets() {
  assets = await loadAssets();
}

function template(body: string): string {
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
        <tr><td>
          <img src="cid:banner" width="600" style="display:block;width:100%;max-width:600px;" />
        </td></tr>
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

export async function sendRegistrationEmail(to: string, parentName: string, childName: string): Promise<void> {
  if (!to) return;
  const html = template(`
    <p style="color:#1B2B6B;font-size:18px;font-weight:600;margin:0 0 16px;">Kedves ${parentName}!</p>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 12px;">
      Köszönjük jelentkezésed a 2026/27-es tanévre a Gigászok Sportegyesület úszó szakosztályába.
    </p>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 12px;">
      Jelentkezésed egy 5.000&nbsp;Ft-os szakosztályi hozzájárulással tudod megerősíteni,
      amely természetesen a szeptemberi szakosztályi hozzájárulásból jóváírásra kerül.
    </p>
    <table style="background:#f0f4ff;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;box-sizing:border-box;">
      <tr><td style="color:#1B2B6B;font-size:14px;padding:4px 0;"><strong>Bankszámlaszám:</strong> 62100140 - 11035408 - 00000000</td></tr>
      <tr><td style="color:#1B2B6B;font-size:14px;padding:4px 0;"><strong>Kedvezményezett:</strong> Gigászok Sportegyesület</td></tr>
      <tr><td style="color:#1B2B6B;font-size:14px;padding:4px 0;"><strong>Közlemény:</strong> Támogatás - ${childName}</td></tr>
    </table>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 12px;">
      A regisztráció megerősítésére azért van szükség, mert csoportjaink évről évre túltelítettek,
      és ezúton szeretnénk helyet biztosítani a valóban motivált és elkötelezett jelentkezőknek.
    </p>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0;">
      A tanévvel kapcsolatos további információkat erre az e-mail címre fogod megkapni. Csobbanj velünk szeptemberben!
    </p>
  `);

  await transporter.sendMail({
    from: `"Gigászok" <${config.smtp.from}>`,
    to,
    subject: `Beiratkozási jelentkezés beérkezett – ${childName}`,
    html,
    attachments: [
      { filename: "beiratkozas.png", content: assets.registrationBanner, cid: "banner" },
      { filename: "footer.png", content: assets.footer, cid: "footer" },
    ],
  });
}

export async function sendReminderEmail(to: string, parentName: string, childName: string): Promise<void> {
  if (!to) return;
  const html = template(`
    <p style="color:#1B2B6B;font-size:18px;font-weight:600;margin:0 0 16px;">Kedves ${parentName}!</p>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 12px;">
      Emlékeztetőül jelezzük, hogy <strong>${childName}</strong> beiratkozása még nem véglegesített,
      mivel az 5 000 Ft-os szakosztályi hozzájárulás még nem érkezett meg.
    </p>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 12px;">
      Kérjük, utald el az összeget az alábbi adatokkal:
    </p>
    <table style="background:#f0f4ff;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;box-sizing:border-box;">
      <tr><td style="color:#1B2B6B;font-size:14px;padding:4px 0;"><strong>Számlaszám:</strong> 62100140 - 11035408 - 00000000</td></tr>
      <tr><td style="color:#1B2B6B;font-size:14px;padding:4px 0;"><strong>Közlemény:</strong> Adomány - ${childName}</td></tr>
      <tr><td style="color:#1B2B6B;font-size:14px;padding:4px 0;"><strong>Összeg:</strong> 5 000 Ft</td></tr>
    </table>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 12px;">
      Ha már átutaltad, kérjük hagyd figyelmen kívül ezt az üzenetet!
    </p>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0;">
      Amennyiben vissza szeretnéd vonni a jelentkezést, kérjük jelezd az alábbi elérhetőségek egyikén.
    </p>
  `);

  await transporter.sendMail({
    from: `"Gigászok" <${config.smtp.from}>`,
    to,
    subject: `Emlékeztető: beiratkozási díj – ${childName}`,
    html,
    attachments: [
      { filename: "beiratkozas.png", content: assets.reminderBanner, cid: "banner" },
      { filename: "footer.png", content: assets.footer, cid: "footer" },
    ],
  });
}

export async function sendPaymentConfirmationEmail(to: string, parentName: string, childName: string): Promise<void> {
  if (!to) return;
  const html = template(`
    <p style="color:#1B2B6B;font-size:18px;font-weight:600;margin:0 0 16px;">Kedves ${parentName}!</p>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 12px;">
      Örömmel értesítünk, hogy <strong>${childName}</strong> beiratkozási díja (5 000 Ft) megérkezett!
    </p>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 12px;">
      A beiratkozás <strong>visszaigazolva</strong>. Az 5 000 Ft az első havidíjba kerül beszámításra.
    </p>
    <p style="color:#333;font-size:15px;line-height:1.6;margin:0;">
      Várunk szeptemberben úszni! 🏊
    </p>
  `);

  await transporter.sendMail({
    from: `"Gigászok" <${config.smtp.from}>`,
    to,
    subject: `Beiratkozás megerősítve – ${childName}`,
    html,
    attachments: [
      { filename: "beiratkozas.png", content: assets.banner, cid: "banner" },
      { filename: "footer.png", content: assets.footer, cid: "footer" },
    ],
  });
}
