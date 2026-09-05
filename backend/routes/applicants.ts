import { getApplicants, getApplicantById, deleteApplicantById, putApplicantPaid, getApplicantEmailLog } from "../controllers/applicant_controller";

export const applicantRoutes = {
  "/api/terms/:id/applicants": { GET: getApplicants },
  "/api/terms/:id/applicants/:applicantId": { GET: getApplicantById, DELETE: deleteApplicantById },
  "/api/terms/:id/applicants/:applicantId/paid": { PUT: putApplicantPaid },
  "/api/terms/:id/applicants/:applicantId/email-log": { GET: getApplicantEmailLog },
};
