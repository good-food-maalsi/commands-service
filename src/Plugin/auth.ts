import { Elysia } from "elysia";
import { verifyToken, toAuthUser, Role } from "@good-food/utils";
import type { AuthUser, UserPayload } from "@good-food/utils";
import { env } from "../Utils/env.js";

export { Role };

console.log("[AUTH] Plugin chargé (derive s'exécutera sur chaque requête)");

export const authPlugin = new Elysia({ name: "auth" })
    .derive(
        async ({
            headers,
            request,
        }): Promise<{
            user: AuthUser | null;
            userPayload: UserPayload | null;
        }> => {
            console.log("\n[AUTH] ========== New Request ==========");
            console.log("[AUTH] Method:", request.method);
            console.log("[AUTH] URL:", request.url);

            // Try to get token from Authorization header
            const authHeader =
                headers.authorization || headers["authorization"];
            const token = authHeader?.startsWith("Bearer ")
                ? authHeader.slice(7)
                : undefined;
            console.log("🚀 ~ token:", token);

            console.log(
                "[AUTH] Authorization Header:",
                authHeader ? `${authHeader.slice(0, 30)}...` : "❌ NOT FOUND",
            );
            console.log(
                "[AUTH] Extracted Token:",
                token ? `${token.slice(0, 30)}...` : "❌ NOT FOUND",
            );

            // Also check for cookie (shouldn't be used but good to debug)
            const cookieHeader = headers.cookie || headers["Cookie"];
            if (cookieHeader) {
                console.log(
                    "[AUTH] Cookie header present:",
                    cookieHeader.substring(0, 50) + "...",
                );
            } else {
                console.log("[AUTH] Cookie header: ❌ NOT FOUND");
            }

            if (!token) {
                console.log("[AUTH] ❌ No token found - returning null user");
                return { user: null, userPayload: null };
            }

            // Verify token using @good-food/utils
            const payload = await verifyToken(token, {
                publicKeyBase64: env.JWT_PUBLIC_KEY_BASE64,
            });

            console.log(
                "[AUTH] Token verification result:",
                payload ? "✅ VALID" : "❌ INVALID",
            );
            if (payload) {
                console.log(
                    "[AUTH] Token payload - sub:",
                    payload.sub,
                    "email:",
                    payload.email,
                );
            }

            if (!payload) {
                console.log(
                    "[AUTH] ❌ Token verification failed - returning null user",
                );
                return { user: null, userPayload: null };
            }

            // Convert to AuthUser for convenience
            const user = toAuthUser(payload);
            console.log(
                "[AUTH] ✅ Authenticated user:",
                user
                    ? `id: ${user.id}, email: ${payload.email}, roles: ${user.roles.join(", ")}`
                    : "null",
            );
            console.log("[AUTH] ====================================\n");

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
                    return error(403, {
                        message: "Forbidden - Admin access required",
                    });
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
                    user.roles.includes(Role.STAFF) ||
                    user.roles.includes(Role.ADMIN);
                if (!hasAccess) {
                    return error(403, {
                        message: "Forbidden - Staff access required",
                    });
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
