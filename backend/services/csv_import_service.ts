import { db } from "../db";
import { parseCSV, isAmount5000 } from "./csv";
import { handlePaymentConfirmed } from "./payment_service";
import type { Applicant, CSVResult } from "../schema";

export function importCSV(termId: string, csvText: string): CSVResult {
  const rows = parseCSV(csvText);
  const applicants = db.prepare(`SELECT * FROM applicants WHERE term_id = ?`).all(termId) as Applicant[];

  const byName = new Map(applicants.map(a => [a.child_name.toLowerCase().trim(), a]));
  const result: CSVResult = { matched: 0, updated: 0, already_paid: 0 };
  const toConfirm: Applicant[] = [];

  for (const row of rows) {
    if (!row.some(cell => isAmount5000(cell))) continue;
    const descCell = row.find(cell => cell.toLowerCase().trim().startsWith("adomány - "));
    if (!descCell) continue;
    const name = descCell.toLowerCase().trim().slice("adomány - ".length);
    const applicant = byName.get(name);
    if (!applicant) continue;

    result.matched++;
    if (applicant.paid) {
      result.already_paid++;
    } else {
      db.prepare(`UPDATE applicants SET paid = 1 WHERE id = ?`).run(applicant.id);
      applicant.paid = 1;
      result.updated++;
      toConfirm.push(applicant);
    }
  }

  for (const a of toConfirm) handlePaymentConfirmed(termId, a);

  return result;
}
