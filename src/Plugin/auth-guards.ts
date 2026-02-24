import { Elysia } from "elysia";
import {
  authMiddleware,
  createAuthMiddleware,
  Role,
} from "../Middleware/auth.middleware.js";

export { Role } from "../Middleware/auth.middleware.js";

/**
 * Groupe Elysia qui exige une authentification (token valide).
 * Usage: .use(requireAuth)
 */
export const requireAuth = new Elysia({ name: "require-auth" }).use(authMiddleware);

/**
 * Groupe Elysia qui exige des rôles précis.
 * Usage: .use(requireRoles([Role.ADMIN, Role.STAFF]))
 */
export function requireRoles(roles: Role | Role[]) {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  return new Elysia({ name: "require-roles" }).use(
    createAuthMiddleware({ allowedRoles: requiredRoles }),
  );
}

export const requireAdmin = requireRoles(Role.ADMIN);
export const requireStaff = requireRoles([Role.STAFF, Role.ADMIN]);
export const requireFranchiseOwner = requireRoles([Role.FRANCHISE_OWNER, Role.ADMIN]);
export const requireCustomer = requireRoles(Role.CUSTOMER);
