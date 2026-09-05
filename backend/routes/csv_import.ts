import { postCSVImport } from "../controllers/csv_import_controller";

export const csvImportRoutes = {
  "/api/terms/:id/csv": { POST: postCSVImport },
};
