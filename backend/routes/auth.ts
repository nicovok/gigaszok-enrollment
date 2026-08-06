import { signToken, verifyToken, getPocketIDAuthUrl, getPocketIDLogoutUrl, exchangeCodeForToken, getUserInfo } from "../auth";
import { db } from "../db";
import type { Admin } from "../schema";
import { randomUUID } from "crypto";

export const authRoutes = {
  "/api/auth/login": {
    GET: () => Response.json({ authUrl: getPocketIDAuthUrl() }),
  },

  "/api/auth/callback": {
    async GET(req: Request) {
      const code = new URL(req.url).searchParams.get("code");
      if (!code) return Response.json({ error: "Missing code" }, { status: 400 });

      try {
        const tokenData = await exchangeCodeForToken(code);
        const userInfo = await getUserInfo(tokenData.access_token);

        const sub = userInfo.sub as string;
        const email = userInfo.email as string;
        const name = (userInfo.name ?? userInfo.preferred_username ?? "Admin") as string;

        let admin = db.prepare(`SELECT * FROM admins WHERE pocketid_sub = ?`).get(sub) as Admin | undefined;

        if (!admin) {
          const id = randomUUID();
          const created_at = Date.now();
          db.prepare(`INSERT INTO admins (id, pocketid_sub, name, email, created_at) VALUES (?, ?, ?, ?, ?)`).run(id, sub, name, email, created_at);
          admin = { id, pocketid_sub: sub, name, email, created_at };
        } else {
          db.prepare(`UPDATE admins SET name = ?, email = ? WHERE id = ?`).run(name, email, admin.id);
        }

        const token = await signToken({ sub: admin.id, email: admin.email, name: admin.name, picture: userInfo.picture });
        return new Response(null, { status: 302, headers: { Location: `/?token=${token}` } });
      } catch (err) {
        return Response.json({ error: "Auth failed", details: String(err) }, { status: 400 });
      }
    },
  },

  "/api/auth/logout": {
    GET(req: Request) {
      const origin = new URL(req.url).origin;
      return new Response(null, { status: 302, headers: { Location: getPocketIDLogoutUrl(`${origin}/`) } });
    },
  },

  "/api/auth/verify": {
    async GET(req: Request) {
      const token = req.headers.get("Authorization")?.slice(7);
      if (!token) return Response.json({ authenticated: false }, { status: 401 });
      const payload = await verifyToken(token);
      if (!payload) return Response.json({ authenticated: false }, { status: 401 });
      return Response.json({ authenticated: true, user: { sub: payload.sub, email: payload.email, name: payload.name } });
    },
  },
};
