import { getXlsxExport } from "../controllers/xlsx_controller";

export const xlsxExportRoutes = {
  "/api/terms/:id/applicants/export": { GET: getXlsxExport },
};
