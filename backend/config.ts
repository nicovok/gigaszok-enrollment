import { dirname } from "node:path";

function env(key: string): string {
  const value = Bun.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const config = {
  dataDir: dirname(Bun.env.DB_PATH ?? "./beiratkozas.db"),
  port: parseInt(Bun.env.PORT ?? "3000"),
  jwtSecret: env("JWT_SECRET"),
  smtp: {
    host: env("SMTP_HOST"),
    port: parseInt(Bun.env.SMTP_PORT ?? "2525"),
    user: env("SMTP_USR"),
    pass: env("SMTP_PASS"),
    from: Bun.env.EMAIL_FROM ?? env("SMTP_USR"),
  },
  pocketId: {
    baseUrl: "https://auth.nicoprt.xyz",
    clientId: env("POCKETID_CLIENT_ID"),
    clientSecret: env("POCKETID_CLIENT_SECRET"),
    redirectUri: env("POCKETID_REDIRECT_URI"),
  },
};
