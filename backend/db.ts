import { Database } from "bun:sqlite";
import type { EmailTemplate } from "./schema";

const sqlite = new Database(Bun.env.DB_PATH ?? "beiratkozas.db");
export const db = sqlite;

export function getTemplate(termId: string, type: EmailTemplate["type"]): EmailTemplate | undefined {
  return db.prepare(`SELECT * FROM email_templates WHERE term_id = ? AND type = ?`).get(termId, type) as EmailTemplate | null ?? undefined;
}

export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      pocketid_sub TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS terms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      webhook_secret TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      applicant_id TEXT NOT NULL,
      type TEXT NOT NULL,
      sent_at INTEGER NOT NULL,
      FOREIGN KEY(applicant_id) REFERENCES applicants(id)
    );

    CREATE TABLE IF NOT EXISTS outgoing_webhooks (
      id TEXT PRIMARY KEY,
      term_id TEXT NOT NULL,
      event TEXT NOT NULL,
      url TEXT NOT NULL,
      auth_header TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(term_id) REFERENCES terms(id),
      UNIQUE(term_id, event)
    );

    CREATE TABLE IF NOT EXISTS email_templates (
      id TEXT PRIMARY KEY,
      term_id TEXT NOT NULL,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      body_after TEXT,
      banner_path TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(term_id) REFERENCES terms(id),
      UNIQUE(term_id, type)
    );

    CREATE TABLE IF NOT EXISTS applicants (
      id TEXT PRIMARY KEY,
      term_id TEXT NOT NULL,
      child_name TEXT NOT NULL,
      parent_name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      raw_json TEXT NOT NULL,
      paid INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(term_id) REFERENCES terms(id)
    );
  `);

  // Migrations for existing databases
  try { sqlite.exec(`ALTER TABLE email_templates ADD COLUMN banner_path TEXT`); } catch {}
  try { sqlite.exec(`ALTER TABLE terms ADD COLUMN webhook_secret TEXT NOT NULL DEFAULT ''`); } catch {}
}
