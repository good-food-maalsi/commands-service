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
    shopId: t.String(),
    items: t.Array(
        t.Object({
            itemId: t.String(),
            quantity: t.Integer({ min: 1 }),
            unitPrice: t.Number({ min: 0 }),
            selectedOptions: t.Optional(t.Array(t.Object({
                name: t.String(),
                additionalPrice: t.Number()
            })))
        })
    ),
});

export const UpdateOrderStatusDTO = t.Object({
    status: t.String(),
});
