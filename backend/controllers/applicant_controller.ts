import { requireAuth } from "../middleware";
import { requireTerm } from "../services/term_service";
import { listApplicants, getApplicant, deleteApplicant, setApplicantPaid, getEmailLog } from "../services/applicant_service";
import type { BunRequest } from "../schema";

export async function getApplicants(req: Request) {
  await requireAuth(req);
  const termId = (req as BunRequest<{ id: string }>).params.id;
  requireTerm(termId);
  return Response.json(listApplicants(termId));
}

export async function getApplicantById(req: Request) {
  await requireAuth(req);
  const { id: termId, applicantId } = (req as BunRequest<{ id: string; applicantId: string }>).params;
  return Response.json(getApplicant(applicantId, termId));
}

export async function deleteApplicantById(req: Request) {
  await requireAuth(req);
  const { id: termId, applicantId } = (req as BunRequest<{ id: string; applicantId: string }>).params;
  deleteApplicant(applicantId, termId);
  return Response.json({ ok: true });
}

export async function putApplicantPaid(req: Request) {
  await requireAuth(req);
  const { id: termId, applicantId } = (req as BunRequest<{ id: string; applicantId: string }>).params;
  const { paid } = await req.json() as { paid: boolean };
  setApplicantPaid(applicantId, termId, paid);
  return Response.json({ ok: true });
}

export async function getApplicantEmailLog(req: Request) {
  await requireAuth(req);
  const { applicantId } = (req as BunRequest<{ id: string; applicantId: string }>).params;
  return Response.json(getEmailLog(applicantId));
}
