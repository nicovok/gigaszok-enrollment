import { db } from "../db";
import { requireTerm } from "./term_service";
import { registerApplicant } from "./registration_service";
import type { FamilyRecord, RegistryExport } from "../../registry/types";

export function buildRegistryExport(termId: string, filter: "all" | "paid" | "unpaid"): RegistryExport {
  const whereSuffix = filter === "paid" ? " AND paid = 1" : filter === "unpaid" ? " AND paid = 0" : "";
  const rows = db.prepare(
    `SELECT child_name, parent_name, email FROM applicants WHERE term_id = ?${whereSuffix} ORDER BY parent_name ASC`,
  ).all(termId) as { child_name: string; parent_name: string; email: string }[];

  const familyMap = new Map<string, { parent_name: string; parent_email: string; children: string[] }>();
  for (const row of rows) {
    const key = row.email.toLowerCase();
    if (!familyMap.has(key)) {
      familyMap.set(key, { parent_name: row.parent_name, parent_email: row.email, children: [] });
    }
    familyMap.get(key)!.children.push(row.child_name);
  }

  const families: FamilyRecord[] = [...familyMap.values()].map((f) => ({
    parent_name: f.parent_name,
    parent_email: f.parent_email,
    parent_phone: "",
    parent_notes: "",
    children: f.children.map((name) => ({ name, birth_date: "", notes: "" })),
  }));

  return {
    schema_version: "1",
    source: "gigaszok-beiratkozas",
    exported_at: new Date().toISOString(),
    families,
  };
}

export function importRegistry(
  termId: string,
  families: FamilyRecord[],
): { imported: number; skipped: number } {
  const term = requireTerm(termId);
  let imported = 0;
  let skipped = 0;

  for (const family of families) {
    const emailLower = family.parent_email.toLowerCase();
    const existing = db.prepare(
      `SELECT 1 FROM applicants WHERE lower(email) = ? AND term_id = ? LIMIT 1`,
    ).get(emailLower, termId);

    if (existing) {
      skipped++;
      continue;
    }

    try {
      for (const child of family.children) {
        registerApplicant(term, {
          child_name: child.name,
          parent_name: family.parent_name,
          email: family.parent_email,
          form_data: "IMPORT",
        });
      }
      imported++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped };
}
