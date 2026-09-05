import { initDb } from "./db";
import { initEmailAssets } from "./email";
import { config } from "./config";
import { AuthError } from "./middleware";
import { NotFoundError, ConflictError, ValidationError } from "./errors";
import { authRoutes } from "./routes/auth";
import { termRoutes } from "./routes/terms";
import { applicantRoutes } from "./routes/applicants";
import { messagingRoutes } from "./routes/messaging";
import { csvImportRoutes } from "./routes/csv_import";
import { emailTemplateRoutes } from "./routes/email_templates";
import { outgoingWebhookRoutes } from "./routes/outgoing_webhooks";
import { webhookRoutes } from "./routes/webhook";
import { xlsxExportRoutes } from "./routes/xlsx_export";
import frontend from "../frontend/index.html";

initDb();
await initEmailAssets();

const server = Bun.serve({
  port: config.port,
  routes: {
    "/": frontend,
    ...authRoutes,
    ...termRoutes,
    ...applicantRoutes,
    ...messagingRoutes,
    ...csvImportRoutes,
    ...emailTemplateRoutes,
    ...outgoingWebhookRoutes,
    ...xlsxExportRoutes,
    ...webhookRoutes,
  },
  error(err) {
    if (err instanceof AuthError) return Response.json({ error: err.message }, { status: 401 });
    if (err instanceof NotFoundError) return Response.json({ error: err.message }, { status: 404 });
    if (err instanceof ConflictError) return Response.json({ error: err.message }, { status: 409 });
    if (err instanceof ValidationError) return Response.json({ error: err.message }, { status: 400 });
    console.error("[server error]", err);
    return Response.json({ error: String(err) }, { status: 500 });
  },
});

console.log(`Running on http://localhost:${server.port}`);
