import { requireAuth } from "../middleware";
import { requireTerm } from "../services/term_service";
import { broadcastMessage, remindUnpaid, resendRegistrationEmail, remindApplicant } from "../services/messaging_service";
import type { BunRequest } from "../schema";

export async function postBroadcast(req: Request) {
  await requireAuth(req);
  const termId = (req as BunRequest<{ id: string }>).params.id;
  requireTerm(termId);
  const { subject, body, filter } = await req.json() as { subject: string; body: string; filter: "all" | "paid" | "unpaid" };
  if (!subject?.trim() || !body?.trim()) {
    return Response.json({ error: "Subject and body are required" }, { status: 400 });
  }
  const result = await broadcastMessage(termId, subject.trim(), body.trim(), filter);
  return Response.json(result);
}

export async function postRemind(req: Request) {
  await requireAuth(req);
  const termId = (req as BunRequest<{ id: string }>).params.id;
  requireTerm(termId);
  const result = await remindUnpaid(termId);
  return Response.json(result);
}

export async function postResendRegistrationEmail(req: Request) {
  await requireAuth(req);
  const { id: termId, applicantId } = (req as BunRequest<{ id: string; applicantId: string }>).params;
  await resendRegistrationEmail(termId, applicantId);
  return Response.json({ ok: true });
}

export async function postRemindApplicant(req: Request) {
  await requireAuth(req);
  const { id: termId, applicantId } = (req as BunRequest<{ id: string; applicantId: string }>).params;
  await remindApplicant(termId, applicantId);
  return Response.json({ ok: true });
}
