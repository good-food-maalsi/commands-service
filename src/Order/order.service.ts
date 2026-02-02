import { PrismaClient } from "@prisma/client";
import { CreateOrderDTO } from "./dto/order.dto.js";

type CreateOrderType = typeof CreateOrderDTO.static;

export class OrderService {
    constructor(private db: PrismaClient) { }

    async create(data: CreateOrderType) {
        const total = data.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

        return this.db.order.create({
            data: {
                total,
                status: "PENDING",
                items: {
                    create: data.items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.price,
                    })),
                },
            },
            include: {
                items: true,
            },
        });
    }

    async getAll() {
        return this.db.order.findMany({
            include: {
                items: true,
            },
        });
    }

    async getById(id: string) {
        return this.db.order.findUnique({
            where: { id },
            include: {
                items: true,
            },
        });
    }

    async updateStatus(id: string, status: any) { // Type to be refined with Prisma Enum
        return this.db.order.update({
            where: { id },
            data: { status },
        });
    }
}
