import { Elysia } from 'elysia'
import { authPlugin, Role } from './auth.js'
import type { AuthUser } from '@good-food/utils'

// Re-export Role for convenience
export { Role } from './auth.js'

/**
 * Creates an Elysia group that requires authentication
 * Usage: .use(requireAuth)
 */
export const requireAuth = new Elysia({ name: 'require-auth' })
    .use(authPlugin)
    .onBeforeHandle((context: any) => {
        if (!context.user) {
            return context.error(401, { message: 'Unauthorized - Authentication required' })
        }
    })

/**
 * Creates an Elysia group that requires specific roles
 * Usage: .use(requireRoles([Role.ADMIN, Role.STAFF]))
 */
export function requireRoles(roles: Role | Role[]) {
    const requiredRoles = Array.isArray(roles) ? roles : [roles]

    return new Elysia({ name: 'require-roles' })
        .use(authPlugin)
        .onBeforeHandle((context: any) => {
            if (!context.user) {
                return context.error(401, { message: 'Unauthorized - Authentication required' })
            }

            const userRoles = context.user.roles || []
            const hasPermission = userRoles.some((role: Role) => requiredRoles.includes(role))

            if (!hasPermission) {
                return context.error(403, {
                    message: 'Forbidden - Insufficient permissions',
                    required: requiredRoles,
                    actual: userRoles
                })
            }
        })
}

/**
 * Admin-only guard
 */
export const requireAdmin = requireRoles(Role.ADMIN)

/**
 * Staff or Admin guard
 */
export const requireStaff = requireRoles([Role.STAFF, Role.ADMIN])

/**
 * Franchise owner or Admin guard
 */
export const requireFranchiseOwner = requireRoles([Role.FRANCHISE_OWNER, Role.ADMIN])

/**
 * Customer-only guard
 */
export const requireCustomer = requireRoles(Role.CUSTOMER)
