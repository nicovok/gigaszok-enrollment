import { requireAuth } from "../middleware";
import { db, requireTerm } from "../db";
import type { BunRequest, Applicant, CSVResult } from "../schema";
import { parseCSV, isAmount5000 } from "../csv";
import { handlePaymentConfirmed } from "../payment";

export const csvImportRoutes = {
  "/api/terms/:id/csv": {
    async POST(req: Request) {
      await requireAuth(req);
      const termId = (req as BunRequest<{ id: string }>).params.id;

      requireTerm(termId);
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return Response.json({ error: "No file uploaded" }, { status: 400 });

      const text = await file.text();
      const rows = parseCSV(text);

      const applicants = db.prepare(
        `SELECT * FROM applicants WHERE term_id = ?`
      ).all(termId) as Applicant[];

      // Index applicants by normalised name for O(1) lookup per CSV row
      const byName = new Map(
        applicants.map(a => [a.child_name.toLowerCase().trim(), a])
      );

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

      return Response.json(result);
    },
  },
};
