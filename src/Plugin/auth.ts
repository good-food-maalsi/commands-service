import { createAuthMiddleware, Role } from "@good-food/utils";

export const authPlugin = createAuthMiddleware({
    allowedRoles: [Role.CUSTOMER],
});
