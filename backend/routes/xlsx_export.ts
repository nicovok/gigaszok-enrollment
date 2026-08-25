import ExcelJS from "exceljs";
import { requireAuth } from "../middleware";
import { db, requireTerm } from "../db";
import type { BunRequest, Applicant } from "../schema";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("hu-HU", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export const xlsxExportRoutes = {
  "/api/terms/:id/applicants/export": {
    async GET(req: Request) {
      await requireAuth(req);
      const termId = (req as BunRequest<{ id: string }>).params.id;
      requireTerm(termId);

      const filter = new URL(req.url).searchParams.get("filter") ?? "all";
      const whereSuffix = filter === "paid" ? " AND paid = 1" : filter === "unpaid" ? " AND paid = 0" : "";
      const rows = db.prepare(
        `SELECT * FROM applicants WHERE term_id = ?${whereSuffix} ORDER BY created_at DESC`
      ).all(termId) as Applicant[];

      // Collect all unique field names in insertion order
      const fieldNames = new Set<string>();
      const parsedRows = rows.map(row => {
        let formFields: Record<string, { value: unknown; name: string; type: string }> = {};
        try {
          formFields = row.raw_json ? JSON.parse(row.raw_json) : {};
        } catch { /* skip */ }
        for (const entry of Object.values(formFields)) {
          fieldNames.add(entry.name);
        }
        return { row, formFields };
      });

      const fieldNameList = [...fieldNames];

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Jelentkezők");

      const headerRow = ["Gyermek neve", "Szülő neve", "Email", ...fieldNameList, "Befizetve", "Regisztráció dátuma"];
      const header = sheet.addRow(headerRow);
      header.font = { bold: true };

      for (const { row, formFields } of parsedRows) {
        const fieldValues = fieldNameList.map(name => {
          const entry = Object.values(formFields).find(f => f.name === name);
          if (!entry) return "";
          if (entry.type === "signature") {
            const arr = entry.value as Array<{ file_name?: string }> | null;
            return arr?.[0]?.file_name ?? "";
          }
          return String(entry.value ?? "");
        });

        sheet.addRow([
          row.child_name,
          row.parent_name,
          row.email,
          ...fieldValues,
          row.paid ? "Igen" : "Nem",
          formatDate(row.created_at),
        ]);
      }

      // Auto-width columns
      sheet.columns.forEach(col => {
        let maxLen = 10;
        col.eachCell?.({ includeEmpty: true }, cell => {
          const len = String(cell.value ?? "").length;
          if (len > maxLen) maxLen = len;
        });
        col.width = Math.min(maxLen + 2, 50);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      return new Response(buffer as Buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="jelentkezok.xlsx"`,
        },
      });
    },
  },
};
