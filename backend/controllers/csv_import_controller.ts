import { requireAuth } from "../middleware";
import { requireTerm } from "../services/term_service";
import { importCSV } from "../services/csv_import_service";
import type { BunRequest } from "../schema";

export async function postCSVImport(req: Request) {
  await requireAuth(req);
  const termId = (req as BunRequest<{ id: string }>).params.id;
  requireTerm(termId);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file uploaded" }, { status: 400 });

  const text = await file.text();
  const result = importCSV(termId, text);
  return Response.json(result);
}
