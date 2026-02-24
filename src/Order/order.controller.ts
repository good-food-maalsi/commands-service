import { Elysia, t } from "elysia";
import { OrderService } from "./order.service.js";
import { CreateOrderDTO, UpdateOrderStatusDTO } from "./dto/order.dto.js";
import { prismaPlugin } from "../Plugin/prisma.js";
import { authPlugin } from "../Plugin/auth.js";
import type { AuthUser } from "@good-food/utils";
import { Role } from "../Plugin/auth-guards.js";

export const OrderController = new Elysia({ prefix: "/orders" })
    .use(prismaPlugin)
    .use(authPlugin) // Add auth plugin to get user in context
    .decorate({
        getOrderService: (db: any) => new OrderService(db),
    })
    // Protected: ADMIN/STAFF see all orders; CUSTOMER (and others) see only their orders
    .get("/", async (context: any) => {
        const { db, getOrderService, user } = context;

        // Check authentication
        if (!user) {
            context.set.status = 401;
            return { message: 'Unauthorized - Authentication required' };
        }

        const userRoles = user.roles || [];
        const isAdminOrStaff = userRoles.some((role: any) =>
            role === Role.ADMIN || role === Role.STAFF
        );

        if (isAdminOrStaff) {
            return getOrderService(db).getAll();
        }

        // CUSTOMER or other roles: only their own orders
        return getOrderService(db).getByUserId(user.id);
    })
    // Protected: ADMIN/STAFF or owning customer can view a specific order
    .get("/:id", async (context: any) => {
        const { db, getOrderService, params: { id }, user } = context;

        // Check authentication
        if (!user) {
            context.set.status = 401;
            return { message: 'Unauthorized - Authentication required' };
        }

        const order = await getOrderService(db).getById(id);
        if (!order) {
            context.set.status = 404;
            return { message: "Order not found" };
        }

        const userRoles = user.roles || [];
        const isStaffOrAdmin = userRoles.some((role: any) =>
            role === Role.ADMIN || role === Role.STAFF
        );

        const isOwner = order.userId && order.userId === user.id;

        if (!isStaffOrAdmin && !isOwner) {
            context.set.status = 403;
            return {
                message: 'Forbidden - Only ADMIN, STAFF or owning customer can access this order',
                required: [Role.ADMIN, Role.STAFF],
                actual: userRoles
            };
        }

        return order;
    })
    // Protected: Authenticated users can create orders
    .post(
        "/",
        async (context: any) => {
            const { db, getOrderService, body, user } = context;

            // Check authentication
            if (!user) {
                context.set.status = 401;
                return { message: 'Unauthorized - Authentication required' };
            }

            return getOrderService(db).create(body, user.id);
        },
        {
            body: CreateOrderDTO,
        }
    )
    // Protected: Only ADMIN or STAFF can update order status
    .patch(
        "/:id/status",
        async (context: any) => {
            const { db, getOrderService, params, body, user } = context;

            // Check authentication
            if (!user) {
                context.set.status = 401;
                return { message: 'Unauthorized - Authentication required' };
            }

            // Check roles
            const userRoles = user.roles || [];
            const hasPermission = userRoles.some((role: any) =>
                role === Role.ADMIN || role === Role.STAFF
            );

            if (!hasPermission) {
                context.set.status = 403;
                return {
                    message: 'Forbidden - Insufficient permissions',
                    required: [Role.ADMIN, Role.STAFF],
                    actual: userRoles
                };
            }

            return getOrderService(db).updateStatus(params.id, body.status);
        },
        {
            body: UpdateOrderStatusDTO,
        }
    );
