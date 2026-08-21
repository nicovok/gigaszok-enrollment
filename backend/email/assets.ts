// @ts-ignore
import bannerPath from "../email-banner.png" with { type: "file" };
// @ts-ignore
import footerPath from "../email-footer.png" with { type: "file" };
// @ts-ignore
import logoPath from "../email-logo.png" with { type: "file" };

type Assets = { banner: Buffer; footer: Buffer; logo: Buffer };

let assets: Assets;

async function loadAssets(): Promise<Assets> {
  return {
    banner: Buffer.from(await Bun.file(bannerPath).arrayBuffer()),
    footer: Buffer.from(await Bun.file(footerPath).arrayBuffer()),
    logo: Buffer.from(await Bun.file(logoPath).arrayBuffer()),
  };
}

export async function initEmailAssets(): Promise<void> {
  assets = await loadAssets();
}

export function getAssets(): Assets {
  return assets;
}

export async function loadBanner(bannerPath: string | null | undefined): Promise<Buffer | null> {
  if (!bannerPath) return null;
  try {
    const f = Bun.file(bannerPath);
    if (await f.exists()) return Buffer.from(await f.arrayBuffer());
  } catch {}
  return null;
}
