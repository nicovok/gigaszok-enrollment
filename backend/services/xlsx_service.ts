import ExcelJS from "exceljs";
import { db } from "../db";
import type { Applicant } from "../schema";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("hu-HU", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function parseFormDate(str: string): Date | null {
  const dmy = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}`);
    return isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export async function buildApplicantsXlsx(termId: string, filter: string): Promise<Buffer> {
  const whereSuffix = filter === "paid" ? " AND paid = 1" : filter === "unpaid" ? " AND paid = 0" : "";
  const rows = db.prepare(
    `SELECT * FROM applicants WHERE term_id = ?${whereSuffix} ORDER BY created_at DESC`
  ).all(termId) as Applicant[];

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
      const raw = String(entry.value ?? "");
      return parseFormDate(raw) ?? raw;
    });

    const excelRow = sheet.addRow([
      row.child_name,
      row.parent_name,
      row.email,
      ...fieldValues,
      row.paid ? "Igen" : "Nem",
      formatDate(row.created_at),
    ]);
    excelRow.eachCell(cell => {
      if (cell.value instanceof Date) cell.numFmt = "YYYY.MM.DD";
    });
  }

  sheet.columns.forEach(col => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: true }, cell => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 2, 50);
  });

  return await workbook.xlsx.writeBuffer() as Buffer;
}
