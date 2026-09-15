import { requireAuth } from "../middleware";
import { ValidationError } from "../errors";
import { requireTerm } from "../services/term_service";
import { buildRegistryExport, importRegistry } from "../services/registry_service";
import type { BunRequest } from "../schema";
import type { FamilyRecord } from "../../registry/types";

export async function exportRegistryHandler(req: Request) {
  await requireAuth(req);
  const termId = (req as BunRequest<{ id: string }>).params.id;
  requireTerm(termId);

  const body = await req.json() as { filter?: string };
  const filter = (["all", "paid", "unpaid"].includes(body.filter ?? "") ? body.filter : "all") as "all" | "paid" | "unpaid";

  const result = buildRegistryExport(termId, filter);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(result, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="gigaszok-export-${date}.json"`,
    },
  });
}

export async function importRegistryHandler(req: Request) {
  await requireAuth(req);
  const termId = (req as BunRequest<{ id: string }>).params.id;
  requireTerm(termId);

  const body = await req.json() as { families?: unknown };
  if (!Array.isArray(body.families)) throw new ValidationError("families must be an array");

  const result = importRegistry(termId, body.families as FamilyRecord[]);
  return Response.json(result);
}
