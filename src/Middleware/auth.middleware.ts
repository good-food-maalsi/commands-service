import { Elysia } from "elysia";
import { importSPKI, jwtVerify } from "jose";
import { env } from "../Utils/env.js";

export enum Role {
  ADMIN = "ADMIN",
  FRANCHISE_OWNER = "FRANCHISE_OWNER",
  STAFF = "STAFF",
  CUSTOMER = "CUSTOMER",
}

export interface AuthUser {
  id: string;
  roles: Role[];
  email?: string;
}

interface JwtPayload {
  sub?: string;
  email?: string;
  role?: Array<{ role: { role: string } }>;
}

interface AuthMiddlewareOptions {
  allowedRoles?: Role[];
}

function extractRoles(payload: JwtPayload): Role[] {
  const entries = payload.role;
  if (!entries) return [];
  return entries
    .map((e) => e?.role?.role as Role)
    .filter((r): r is Role => Object.values(Role).includes(r));
}

export const createAuthMiddleware = (options: AuthMiddlewareOptions = {}) => {
  const { allowedRoles } = options;

  return new Elysia({ name: "auth-middleware" })
    .derive({ as: "global" }, async ({ headers }): Promise<{ user: AuthUser | null }> => {
      const authHeader = headers["authorization"];
      if (!authHeader?.startsWith("Bearer ")) {
        return { user: null };
      }
      const token = authHeader.split(" ")[1];
      if (!token) {
        return { user: null };
      }
      try {
        const publicKeyContent = Buffer.from(env.JWT_PUBLIC_KEY_BASE64, "base64").toString("utf-8");
        const publicKey = await importSPKI(publicKeyContent, "RS256");
        const { payload } = await jwtVerify(token, publicKey);
        const p = payload as JwtPayload;
        if (!p.sub) {
          return { user: null };
        }
        const user: AuthUser = {
          id: p.sub,
          roles: extractRoles(p),
        };
        if (p.email !== undefined) user.email = p.email;
        return { user };
      } catch {
        return { user: null };
      }
    })
    .onBeforeHandle({ as: "global" }, async ({ headers, set }) => {
      const authHeader = headers["authorization"];

      if (!authHeader?.startsWith("Bearer ")) {
        set.status = 401;
        return { message: "Unauthorized - No Token" };
      }

      const token = authHeader.split(" ")[1];
      if (!token) {
        set.status = 401;
        return { message: "Unauthorized - Empty Token" };
      }

      try {
        const publicKeyContent = Buffer.from(env.JWT_PUBLIC_KEY_BASE64, "base64").toString("utf-8");
        const publicKey = await importSPKI(publicKeyContent, "RS256");
        const { payload } = await jwtVerify(token, publicKey);
        const p = payload as JwtPayload;

        if (allowedRoles && allowedRoles.length > 0) {
          const userRoles = extractRoles(p);
          const hasPermission = userRoles.some((role) => allowedRoles.includes(role));
          if (!hasPermission) {
            set.status = 403;
            return { message: "Forbidden - Insufficient permissions" };
          }
        }
      } catch {
        set.status = 401;
        return { message: "Unauthorized - Invalid Token" };
      }
    });
};

export const authMiddleware = createAuthMiddleware();
