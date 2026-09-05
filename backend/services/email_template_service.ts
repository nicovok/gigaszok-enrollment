import { db } from "../db";
import { config } from "../config";
import { DEFAULT_TEMPLATES, clearBannerCache } from "../email";
import { ValidationError } from "../errors";
import { randomUUID } from "crypto";
import { join } from "node:path";
import { mkdir, rm } from "node:fs/promises";
import type { EmailTemplate, EmailTemplateType } from "../schema";
import { EMAIL_TEMPLATE_TYPES } from "../schema";

function bannersDir() {
  return join(config.dataDir, "banners");
}

export function listEmailTemplates(termId: string) {
  const stored = db.prepare(`SELECT * FROM email_templates WHERE term_id = ?`).all(termId) as EmailTemplate[];
  const byType = Object.fromEntries(stored.map(t => [t.type, t]));

  return EMAIL_TEMPLATE_TYPES.map(type => {
    const s = byType[type];
    const def = DEFAULT_TEMPLATES[type];
    return {
      type,
      subject: s?.subject ?? def.subject,
      body: s?.body ?? def.body,
      has_banner: !!s?.banner_path,
      is_custom: !!s,
    };
  });
}

export function upsertEmailTemplateText(termId: string, type: EmailTemplateType, subject: string, body: string) {
  const existing = db.prepare(`SELECT id FROM email_templates WHERE term_id = ? AND type = ?`).get(termId, type) as { id: string } | null;

  if (existing) {
    db.prepare(`UPDATE email_templates SET subject = ?, body = ? WHERE term_id = ? AND type = ?`)
      .run(subject, body, termId, type);
  } else {
    db.prepare(`INSERT INTO email_templates (id, term_id, type, subject, body, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), termId, type, subject, body, Date.now());
  }
}

export function resetEmailTemplateText(termId: string, type: EmailTemplateType) {
  const row = db.prepare(`SELECT id, banner_path FROM email_templates WHERE term_id = ? AND type = ?`)
    .get(termId, type) as { id: string; banner_path: string | null } | null;

  if (row) {
    if (row.banner_path) {
      const def = DEFAULT_TEMPLATES[type];
      db.prepare(`UPDATE email_templates SET subject = ?, body = ? WHERE id = ?`)
        .run(def.subject, def.body, row.id);
    } else {
      db.prepare(`DELETE FROM email_templates WHERE id = ?`).run(row.id);
    }
  }
}

export async function getBanner(termId: string, type: string): Promise<{ file: ReturnType<typeof Bun.file> } | null> {
  const row = db.prepare(`SELECT banner_path FROM email_templates WHERE term_id = ? AND type = ?`).get(termId, type) as { banner_path: string | null } | null;
  if (!row?.banner_path) return null;
  const file = Bun.file(row.banner_path);
  if (!await file.exists()) return null;
  return { file };
}

export async function uploadBanner(termId: string, type: EmailTemplateType, file: File): Promise<void> {
  const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
  const dir = bannersDir();
  await mkdir(dir, { recursive: true });
  const filename = `${termId}_${type}.${ext}`;
  const filepath = join(dir, filename);
  await Bun.write(filepath, file);
  clearBannerCache(filepath);

  const existing = db.prepare(`SELECT id FROM email_templates WHERE term_id = ? AND type = ?`).get(termId, type) as { id: string } | null;
  if (existing) {
    db.prepare(`UPDATE email_templates SET banner_path = ? WHERE term_id = ? AND type = ?`).run(filepath, termId, type);
  } else {
    const def = DEFAULT_TEMPLATES[type];
    db.prepare(`INSERT INTO email_templates (id, term_id, type, subject, body, banner_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), termId, type, def.subject, def.body, filepath, Date.now());
  }
}

export async function deleteBanner(termId: string, type: string): Promise<void> {
  const row = db.prepare(`SELECT banner_path FROM email_templates WHERE term_id = ? AND type = ?`).get(termId, type) as { banner_path: string | null } | null;

  if (row?.banner_path) {
    clearBannerCache(row.banner_path);
    try { await rm(row.banner_path); } catch { /* file may not exist */ }
    db.prepare(`UPDATE email_templates SET banner_path = NULL WHERE term_id = ? AND type = ?`).run(termId, type);
  }
}
