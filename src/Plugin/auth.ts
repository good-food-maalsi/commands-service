import { createAuthMiddleware, Role, extractRoles } from "@good-food/utils";

export const authPlugin = createAuthMiddleware({
    allowedRoles: [Role.CUSTOMER, Role.ADMIN, Role.STAFF, Role.FRANCHISE_OWNER],
});

export { Role, extractRoles };
