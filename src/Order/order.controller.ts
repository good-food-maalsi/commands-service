import { Elysia, t } from "elysia";
import { OrderService } from "./order.service.js";
import { CreateOrderDTO, UpdateOrderStatusDTO } from "./dto/order.dto.js";
import { prismaPlugin } from "../Plugin/prisma.js";
import { authPlugin } from "../Plugin/auth.js";

export const OrderController = new Elysia({ prefix: "/orders" })
    .use(prismaPlugin)
    .use(authPlugin)
    .decorate({
        getOrderService: (db: any) => new OrderService(db),
    })
    .get("", async ({ db, getOrderService }: any) => {
        return getOrderService(db).getAll();
    })
    .get("/:id", async ({ db, getOrderService, params: { id } }: any) => {
        const order = await getOrderService(db).getById(id);
        if (!order) throw new Error("Order not found");
        return order;
    })
    .post(
        "",
        async (context: any) => {
            const { db, getOrderService, body, user } = context;
            return getOrderService(db).create(body, user.id);
        },
        {
            body: CreateOrderDTO,
        },
    )
    .patch(
        "/:id/status",
        async ({ db, getOrderService, params: { id }, body }: any) => {
            return getOrderService(db).updateStatus(id, body.status);
        },
        {
            body: UpdateOrderStatusDTO,
        },
    );
