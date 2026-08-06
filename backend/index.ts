import { initDb } from "./db";
import { initEmailAssets } from "./email";
import { config } from "./config";
import { AuthError } from "./middleware";
import { authRoutes } from "./routes/auth";
import { termRoutes } from "./routes/terms";
import { applicantRoutes } from "./routes/applicants";
import { emailTemplateRoutes } from "./routes/email-templates";
import { webhookRoutes } from "./routes/webhook";
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
    ...emailTemplateRoutes,
    ...webhookRoutes,
  },
  error(err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: 401 });
    }
    console.error("[server error]", err);
    return Response.json({ error: String(err) }, { status: 500 });
  },
});

console.log(`Running on http://localhost:${server.port}`);
