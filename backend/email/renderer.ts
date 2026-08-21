export function interp(text: string, childName: string, parentName: string): string {
  return text.replace(/\{child_name\}/g, childName).replace(/\{parent_name\}/g, parentName);
}

export function renderBody(text: string, childName: string, parentName: string, box?: string): string {
  return text
    .split("\n")
    .map(line => {
      if (box && line.trim() === "{bank_adatok}") return box;
      if (line.trim() === "") return "<br/>";
      return `<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 12px;">${interp(line, childName, parentName)}</p>`;
    })
    .join("\n");
}

export function bankBox(childName: string, rows: string[]): string {
  const rowsHtml = rows
    .map(r => `<tr><td style="color:#1B2B6B;font-size:14px;padding:4px 0;">${r}</td></tr>`)
    .join("\n");
  return `<table style="background:#f0f4ff;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;box-sizing:border-box;">${rowsHtml}</table>`;
}

export function template(body: string, hasBanner: boolean): string {
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
