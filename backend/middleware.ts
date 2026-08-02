import { verifyToken, type JwtPayload } from "./auth";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireAuth(req: Request): Promise<JwtPayload> {
  const token = req.headers.get("Authorization")?.slice(7);
  if (!token) throw new AuthError("Unauthorized");
  const payload = await verifyToken(token);
  if (!payload) throw new AuthError("Invalid token");
  return payload;
}
