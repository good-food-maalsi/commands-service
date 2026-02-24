import { Elysia } from "elysia";
import {
  verifyToken,
  toAuthUser,
  type UserPayload,
  type AuthUser,
  Role,
} from "@good-food/utils";
import { env } from "../Utils/env.js";

export { Role } from "@good-food/utils";

export const authPlugin = new Elysia({ name: "auth" })
  .derive(
    async ({
      headers,
    }): Promise<{ user: AuthUser | null; userPayload: UserPayload | null }> => {
      // Try to get token from Authorization header
      const authHeader = headers.authorization || headers["authorization"];
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : undefined;

      console.log(
        "[AUTH] Header:",
        authHeader ? `${authHeader.slice(0, 20)}...` : "none",
      );
      console.log("[AUTH] Token:", token ? `${token.slice(0, 20)}...` : "none");

      if (!token) {
        console.log("[AUTH] No token found");
        return { user: null, userPayload: null };
      }

      // Verify token using @good-food/utils
      const payload = await verifyToken(token, {
        publicKeyBase64: env.JWT_PUBLIC_KEY_BASE64,
      });

      console.log("[AUTH] Payload:", payload ? `user: ${payload.sub}` : "null");

      if (!payload) {
        console.log("[AUTH] Token verification failed");
        return { user: null, userPayload: null };
      }

      // Convert to AuthUser for convenience
      const user = toAuthUser(payload);
      console.log(
        "[AUTH] User:",
        user ? `id: ${user.id}, roles: ${user.roles}` : "null",
      );

      return {
        user,
        userPayload: payload,
      };
    },
  )
  .macro(({ onBeforeHandle }) => ({
    // Basic authentication check (backward compatible)
    isSignIn(enabled: boolean = true) {
      if (!enabled) return;

      onBeforeHandle(({ user, error }: any) => {
        if (!user) {
          return error(401, {
            message: "Unauthorized - Authentication required",
          });
        }
      });
    },

    // Role-based access control
    hasRole(requiredRoles: Role | Role[]) {
      const roles = Array.isArray(requiredRoles)
        ? requiredRoles
        : [requiredRoles];

      onBeforeHandle(({ user, error }: any) => {
        if (!user) {
          return error(401, {
            message: "Unauthorized - Authentication required",
          });
        }

        const userRoles = user.roles || [];
        const hasPermission = userRoles.some((role: Role) =>
          roles.includes(role),
        );

        if (!hasPermission) {
          return error(403, {
            message: "Forbidden - Insufficient permissions",
            required: roles,
            actual: userRoles,
          });
        }
      });
    },

    // Convenience macros for common roles
    isAdmin() {
      onBeforeHandle(({ user, error }: any) => {
        if (!user) {
          return error(401, {
            message: "Unauthorized - Authentication required",
          });
        }

        if (!user.roles.includes(Role.ADMIN)) {
          return error(403, { message: "Forbidden - Admin access required" });
        }
      });
    },

    isStaff() {
      onBeforeHandle(({ user, error }: any) => {
        if (!user) {
          return error(401, {
            message: "Unauthorized - Authentication required",
          });
        }

        const hasAccess =
          user.roles.includes(Role.STAFF) || user.roles.includes(Role.ADMIN);
        if (!hasAccess) {
          return error(403, { message: "Forbidden - Staff access required" });
        }
      });
    },

    isFranchiseOwner() {
      onBeforeHandle(({ user, error }: any) => {
        if (!user) {
          return error(401, {
            message: "Unauthorized - Authentication required",
          });
        }

        const hasAccess =
          user.roles.includes(Role.FRANCHISE_OWNER) ||
          user.roles.includes(Role.ADMIN);
        if (!hasAccess) {
          return error(403, {
            message: "Forbidden - Franchise owner access required",
          });
        }
      });
    },

    isCustomer() {
      onBeforeHandle(({ user, error }: any) => {
        if (!user) {
          return error(401, {
            message: "Unauthorized - Authentication required",
          });
        }

        if (!user.roles.includes(Role.CUSTOMER)) {
          return error(403, {
            message: "Forbidden - Customer access required",
          });
        }
      });
    },
  }));
