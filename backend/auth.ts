import crypto from "crypto";
import { config } from "./config";

const secret = config.jwtSecret;
const POCKETID_BASE_URL = config.pocketId.baseUrl;

export type JwtPayload = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  iat?: number;
  exp?: number;
};

function toBase64url(data: string | Buffer): string {
  return (typeof data === "string" ? Buffer.from(data) : data).toString("base64url");
}

export async function signToken(payload: JwtPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = { ...payload, iat: now, exp: now + 7 * 24 * 60 * 60 };

  const headerEncoded  = toBase64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadEncoded = toBase64url(JSON.stringify(jwtPayload));
  const message        = `${headerEncoded}.${payloadEncoded}`;
  const signature      = toBase64url(crypto.createHmac("sha256", secret).update(message).digest());

  return `${message}.${signature}`;
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const [headerEncoded, payloadEncoded, signatureEncoded] = token.split(".");
    if (!headerEncoded || !payloadEncoded || !signatureEncoded) return null;

    const message = `${headerEncoded}.${payloadEncoded}`;
    const signature = toBase64url(crypto.createHmac("sha256", secret).update(message).digest());

    if (signature !== signatureEncoded) return null;

    const payload = JSON.parse(
      Buffer.from(payloadEncoded, "base64url").toString()
    ) as JwtPayload;

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function getPocketIDLogoutUrl(postLogoutRedirectUri: string): string {
  return `${POCKETID_BASE_URL}/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
}

export function getPocketIDAuthUrl(): string {
  const scope = "openid profile email";
  return `${POCKETID_BASE_URL}/authorize?client_id=${config.pocketId.clientId}&redirect_uri=${encodeURIComponent(config.pocketId.redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
}

type OAuthTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type OIDCUserInfo = {
  sub: string;
  email: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
};

export async function exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
  const response = await fetch(`${POCKETID_BASE_URL}/api/oidc/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.pocketId.clientId,
      client_secret: config.pocketId.clientSecret,
      redirect_uri: config.pocketId.redirectUri,
    }).toString(),
  });

  if (!response.ok) throw new Error(`PocketID token exchange failed: ${response.status}`);
  return response.json();
}

export async function getUserInfo(accessToken: string): Promise<OIDCUserInfo> {
  const response = await fetch(`${POCKETID_BASE_URL}/api/oidc/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error(`Failed to fetch user info: ${response.status}`);
  return response.json();
}
