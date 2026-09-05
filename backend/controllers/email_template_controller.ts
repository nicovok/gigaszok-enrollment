import { requireAuth } from "../middleware";
import { ValidationError } from "../errors";
import type { BunRequest, EmailTemplateType } from "../schema";
import { EMAIL_TEMPLATE_TYPES } from "../schema";
import {
  listEmailTemplates,
  upsertEmailTemplateText,
  resetEmailTemplateText,
  getBanner,
  uploadBanner,
  deleteBanner,
} from "../services/email_template_service";

export async function getEmailTemplates(req: Request) {
  await requireAuth(req);
  const termId = (req as BunRequest<{ id: string }>).params.id;
  return Response.json(listEmailTemplates(termId));
}

export async function putEmailTemplate(req: Request) {
  await requireAuth(req);
  const { id: termId, type } = (req as BunRequest<{ id: string; type: string }>).params;

  if (!EMAIL_TEMPLATE_TYPES.includes(type as EmailTemplateType)) {
    return Response.json({ error: "Invalid type" }, { status: 400 });
  }

  const { subject, body } = await req.json() as { subject: string; body: string };
  if (!subject?.trim() || !body?.trim()) {
    return Response.json({ error: "subject and body are required" }, { status: 400 });
  }

  upsertEmailTemplateText(termId, type as EmailTemplateType, subject.trim(), body.trim());
  return Response.json({ ok: true });
}

export async function deleteEmailTemplate(req: Request) {
  await requireAuth(req);
  const { id: termId, type } = (req as BunRequest<{ id: string; type: string }>).params;

  if (!EMAIL_TEMPLATE_TYPES.includes(type as EmailTemplateType)) {
    return Response.json({ error: "Invalid type" }, { status: 400 });
  }

  resetEmailTemplateText(termId, type as EmailTemplateType);
  return Response.json({ ok: true });
}

export async function getBannerImage(req: Request) {
  const { id: termId, type } = (req as BunRequest<{ id: string; type: string }>).params;
  const result = await getBanner(termId, type);
  if (!result) return new Response(null, { status: 404 });
  return new Response(result.file);
}

export async function postBannerUpload(req: Request) {
  await requireAuth(req);
  const { id: termId, type } = (req as BunRequest<{ id: string; type: string }>).params;

  if (!EMAIL_TEMPLATE_TYPES.includes(type as EmailTemplateType)) {
    return Response.json({ error: "Invalid type" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file" }, { status: 400 });
  if (!file.type.startsWith("image/")) return Response.json({ error: "Must be an image" }, { status: 400 });

  await uploadBanner(termId, type as EmailTemplateType, file);
  return Response.json({ ok: true });
}

export async function deleteBannerImage(req: Request) {
  await requireAuth(req);
  const { id: termId, type } = (req as BunRequest<{ id: string; type: string }>).params;
  await deleteBanner(termId, type);
  return Response.json({ ok: true });
}
