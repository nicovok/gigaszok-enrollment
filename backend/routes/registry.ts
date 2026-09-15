import { exportRegistryHandler, importRegistryHandler } from "../controllers/registry_controller";

export const registryRoutes = {
  "/api/terms/:id/registry/export": { POST: exportRegistryHandler },
  "/api/terms/:id/registry/import": { POST: importRegistryHandler },
};
