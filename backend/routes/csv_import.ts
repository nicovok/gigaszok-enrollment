import { requireAuth } from "../middleware";
import { db } from "../db";
import type { BunRequest, Applicant, CSVResult } from "../schema";
import { parseCSV, isAmount5000 } from "../csv";
import { handlePaymentConfirmed } from "../payment";

export const csvImportRoutes = {
  "/api/terms/:id/csv": {
    async POST(req: Request) {
      await requireAuth(req);
      const termId = (req as BunRequest<{ id: string }>).params.id;

      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return Response.json({ error: "No file uploaded" }, { status: 400 });

      const text = await file.text();
      const rows = parseCSV(text);

      const applicants = db.prepare(
        `SELECT * FROM applicants WHERE term_id = ?`
      ).all(termId) as Applicant[];

      const result: CSVResult = { matched: 0, updated: 0, already_paid: 0 };

      for (const applicant of applicants) {
        const pattern = `adomány - ${applicant.child_name.toLowerCase().trim()}`;
        for (const row of rows) {
          const hasDescription = row.some(cell => cell.toLowerCase().trim() === pattern);
          const hasAmount = row.some(cell => isAmount5000(cell));
          if (hasDescription && hasAmount) {
            result.matched++;
            if (applicant.paid) {
              result.already_paid++;
            } else {
              db.prepare(`UPDATE applicants SET paid = 1 WHERE id = ?`).run(applicant.id);
              result.updated++;
              applicant.paid = 1;
              handlePaymentConfirmed(termId, applicant);
            }
            break;
          }
        }
      }

      return Response.json(result);
    },
  },
};
