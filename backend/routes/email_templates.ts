import { requireAuth } from "../middleware";
import { db } from "../db";
import { config } from "../config";
import type { BunRequest, EmailTemplate, EmailTemplateType } from "../schema";
import { DEFAULT_TEMPLATES } from "../email";
import { randomUUID } from "crypto";
import { join } from "node:path";
import { mkdir, rm } from "node:fs/promises";

const VALID_TYPES: EmailTemplateType[] = ["registration", "reminder", "payment_confirmation"];

function bannersDir() {
  return join(config.dataDir, "banners");
}

export const emailTemplateRoutes = {
  "/api/terms/:id/email-templates": {
    async GET(req: Request) {
      await requireAuth(req);
      const termId = (req as BunRequest<{ id: string }>).params.id;

      const stored = db.prepare(`SELECT * FROM email_templates WHERE term_id = ?`).all(termId) as EmailTemplate[];
      const byType = Object.fromEntries(stored.map(t => [t.type, t]));

      const result = VALID_TYPES.map(type => {
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

      return Response.json(result);
    },
  },

  "/api/terms/:id/email-templates/:type": {
    async PUT(req: Request) {
      await requireAuth(req);
      const { id: termId, type } = (req as BunRequest<{ id: string; type: string }>).params;

      if (!VALID_TYPES.includes(type as EmailTemplateType)) {
        return Response.json({ error: "Invalid type" }, { status: 400 });
      }

      const { subject, body } = await req.json() as { subject: string; body: string };

      if (!subject?.trim() || !body?.trim()) {
        return Response.json({ error: "subject and body are required" }, { status: 400 });
      }

      const existing = db.prepare(`SELECT id FROM email_templates WHERE term_id = ? AND type = ?`).get(termId, type) as { id: string } | null;

      if (existing) {
        db.prepare(`UPDATE email_templates SET subject = ?, body = ? WHERE term_id = ? AND type = ?`)
          .run(subject.trim(), body.trim(), termId, type);
      } else {
        db.prepare(`INSERT INTO email_templates (id, term_id, type, subject, body, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
          .run(randomUUID(), termId, type, subject.trim(), body.trim(), Date.now());
      }

      return Response.json({ ok: true });
    },

    async DELETE(req: Request) {
      await requireAuth(req);
      const { id: termId, type } = (req as BunRequest<{ id: string; type: string }>).params;

      if (!VALID_TYPES.includes(type as EmailTemplateType)) {
        return Response.json({ error: "Invalid type" }, { status: 400 });
      }

      const row = db.prepare(`SELECT id, banner_path FROM email_templates WHERE term_id = ? AND type = ?`)
        .get(termId, type) as { id: string; banner_path: string | null } | null;

      if (row) {
        if (row.banner_path) {
          // Reset text to defaults but keep the banner
          const def = DEFAULT_TEMPLATES[type as EmailTemplateType];
          db.prepare(`UPDATE email_templates SET subject = ?, body = ? WHERE id = ?`)
            .run(def.subject, def.body, row.id);
        } else {
          db.prepare(`DELETE FROM email_templates WHERE id = ?`).run(row.id);
        }
      }

      return Response.json({ ok: true });
    },
  },

  "/api/terms/:id/email-templates/:type/banner": {
    async GET(req: Request) {
      // Public — image embedding in preview
      const { id: termId, type } = (req as BunRequest<{ id: string; type: string }>).params;
      const row = db.prepare(`SELECT banner_path FROM email_templates WHERE term_id = ? AND type = ?`).get(termId, type) as { banner_path: string | null } | null;
      if (!row?.banner_path) return new Response(null, { status: 404 });
      const file = Bun.file(row.banner_path);
      if (!await file.exists()) return new Response(null, { status: 404 });
      return new Response(file);
    },

    async POST(req: Request) {
      await requireAuth(req);
      const { id: termId, type } = (req as BunRequest<{ id: string; type: string }>).params;

      if (!VALID_TYPES.includes(type as EmailTemplateType)) {
        return Response.json({ error: "Invalid type" }, { status: 400 });
      }

      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return Response.json({ error: "No file" }, { status: 400 });
      if (!file.type.startsWith("image/")) return Response.json({ error: "Must be an image" }, { status: 400 });

      const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
      const dir = bannersDir();
      await mkdir(dir, { recursive: true });
      const filename = `${termId}_${type}.${ext}`;
      const filepath = join(dir, filename);
      await Bun.write(filepath, file);

      const existing = db.prepare(`SELECT id FROM email_templates WHERE term_id = ? AND type = ?`).get(termId, type) as { id: string } | null;
      if (existing) {
        db.prepare(`UPDATE email_templates SET banner_path = ? WHERE term_id = ? AND type = ?`).run(filepath, termId, type);
      } else {
        const def = DEFAULT_TEMPLATES[type as EmailTemplateType];
        db.prepare(`INSERT INTO email_templates (id, term_id, type, subject, body, banner_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(randomUUID(), termId, type, def.subject, def.body, filepath, Date.now());
      }

      return Response.json({ ok: true });
    },

    async DELETE(req: Request) {
      await requireAuth(req);
      const { id: termId, type } = (req as BunRequest<{ id: string; type: string }>).params;
      const row = db.prepare(`SELECT banner_path FROM email_templates WHERE term_id = ? AND type = ?`).get(termId, type) as { banner_path: string | null } | null;

      if (row?.banner_path) {
        try { await rm(row.banner_path); } catch {}
        db.prepare(`UPDATE email_templates SET banner_path = NULL WHERE term_id = ? AND type = ?`).run(termId, type);
      }

      return Response.json({ ok: true });
    },
  },
};
