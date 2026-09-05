import {
  getEmailTemplates,
  putEmailTemplate,
  deleteEmailTemplate,
  getBannerImage,
  postBannerUpload,
  deleteBannerImage,
} from "../controllers/email_template_controller";

export const emailTemplateRoutes = {
  "/api/terms/:id/email-templates": { GET: getEmailTemplates },
  "/api/terms/:id/email-templates/:type": { PUT: putEmailTemplate, DELETE: deleteEmailTemplate },
  "/api/terms/:id/email-templates/:type/banner": { GET: getBannerImage, POST: postBannerUpload, DELETE: deleteBannerImage },
};
