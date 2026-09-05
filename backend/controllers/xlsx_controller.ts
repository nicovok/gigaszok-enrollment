import { requireAuth } from "../middleware";
import { requireTerm } from "../services/term_service";
import { buildApplicantsXlsx } from "../services/xlsx_service";
import type { BunRequest } from "../schema";

export async function getXlsxExport(req: Request) {
  await requireAuth(req);
  const termId = (req as BunRequest<{ id: string }>).params.id;
  requireTerm(termId);

  const filter = new URL(req.url).searchParams.get("filter") ?? "all";
  const buffer = await buildApplicantsXlsx(termId, filter);
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="jelentkezok.xlsx"`,
    },
  });
}
