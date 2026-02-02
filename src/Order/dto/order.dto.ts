import { t } from "elysia";

export const OrderDTO = t.Object({
    id: t.String(),
    status: t.String(), // Will be enum in Prisma
    total: t.Number(),
    items: t.Array(
        t.Object({
            productId: t.String(),
            quantity: t.Number(),
            price: t.Number(),
        })
    ),
    createdAt: t.Date(),
    updatedAt: t.Date(),
});

export const CreateOrderDTO = t.Object({
    items: t.Array(
        t.Object({
            productId: t.String(),
            quantity: t.Integer({ min: 1 }),
            price: t.Number({ min: 0 }),
        })
    ),
});

export const UpdateOrderStatusDTO = t.Object({
    status: t.String(),
});
