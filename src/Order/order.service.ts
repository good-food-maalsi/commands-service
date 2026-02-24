import { PrismaClient, OrderStatus } from "@prisma/client";
import { CreateOrderDTO } from "./dto/order.dto.js";

import { PaymentService } from "../Payment/payment.service.js";
import { rabbitMQ } from "../Utils/rabbitmq.js";
import { catalogClient } from "../Utils/catalog.client.js";

type CreateOrderType = typeof CreateOrderDTO.static;

export class OrderService {
    private paymentService: PaymentService;

    constructor(private db: PrismaClient) {
        this.paymentService = new PaymentService();
    }

    async create(data: CreateOrderType, userId?: string) {
        // 0. Check Availability
        const isAvailable = await catalogClient.checkAvailability(data.items.map(i => ({ itemId: i.itemId, quantity: i.quantity })));
        if (!isAvailable) {
            throw new Error("Items not available");
        }

        const total = data.items.reduce((acc, item) => {
            const optionsTotal = item.selectedOptions?.reduce((optAcc, opt) => optAcc + opt.additionalPrice, 0) || 0;
            return acc + (item.unitPrice + optionsTotal) * item.quantity;
        }, 0);

        // 1. Create Order as Draft (panier utilisateur) — pas de paiement ici
        const order = await this.db.order.create({
            data: {
                total,
                status: OrderStatus.draft,
                shopId: data.shopId,
                userId: userId || null,
                paymentMethod: "card",
                paymentStatus: "pending",
                items: {
                    create: data.items.map((item) => ({
                        itemId: item.itemId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        selectedOptions: {
                            create: item.selectedOptions?.map(opt => ({
                                name: opt.name,
                                additionalPrice: opt.additionalPrice
                            })) || []
                        }
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        selectedOptions: true
                    }
                },
            },
        });

        return order;
    }

    async getAll() {
        return this.db.order.findMany({
            include: {
                items: true,
            },
        });
    }

    async getByUserId(userId: string) {
        return this.db.order.findMany({
            where: { userId },
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

    async addItem(id: string, item: CreateOrderType['items'][0]) {
        // 1. Check availability
        const isAvailable = await catalogClient.checkAvailability([
            { itemId: item.itemId, quantity: item.quantity }
        ]);
        if (!isAvailable) {
            throw new Error("Item not available");
        }

        // 2. Get current order
        const currentOrder = await this.db.order.findUnique({
            where: { id },
            include: { items: { include: { selectedOptions: true } } }
        });

        if (!currentOrder) {
            throw new Error("Order not found");
        }

        // 3. Calculate item price (unit + options)
        const optionsTotal = item.selectedOptions?.reduce(
            (acc, opt) => acc + opt.additionalPrice, 0
        ) || 0;
        const itemTotal = (item.unitPrice + optionsTotal) * item.quantity;

        // 4. Add the new item and update total
        const updatedOrder = await this.db.order.update({
            where: { id },
            data: {
                total: Number(currentOrder.total) + itemTotal,
                items: {
                    create: {
                        itemId: item.itemId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        selectedOptions: {
                            create: item.selectedOptions?.map(opt => ({
                                name: opt.name,
                                additionalPrice: opt.additionalPrice
                            })) || []
                        }
                    }
                }
            },
            include: {
                items: {
                    include: {
                        selectedOptions: true
                    }
                }
            }
        });

        return updatedOrder;
    }

    async updateItems(id: string, items: CreateOrderType['items']) {
        // 1. Check availability
        const isAvailable = await catalogClient.checkAvailability(
            items.map(i => ({ itemId: i.itemId, quantity: i.quantity }))
        );
        if (!isAvailable) {
            throw new Error("Items not available");
        }

        // 2. Calculate new total
        const total = items.reduce((acc, item) => {
            const optionsTotal = item.selectedOptions?.reduce(
                (optAcc, opt) => optAcc + opt.additionalPrice, 0
            ) || 0;
            return acc + (item.unitPrice + optionsTotal) * item.quantity;
        }, 0);

        // 3. Delete old items and create new ones
        await this.db.orderItem.deleteMany({
            where: { orderId: id }
        });

        const updatedOrder = await this.db.order.update({
            where: { id },
            data: {
                total,
                items: {
                    create: items.map((item) => ({
                        itemId: item.itemId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        selectedOptions: {
                            create: item.selectedOptions?.map(opt => ({
                                name: opt.name,
                                additionalPrice: opt.additionalPrice
                            })) || []
                        }
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        selectedOptions: true
                    }
                },
            },
        });

        return updatedOrder;
    }

    async updateStatus(id: string, status: OrderStatus) {
        const updatedOrder = await this.db.order.update({
            where: { id },
            data: { status },
            include: { items: true }
        });

        if (status === OrderStatus.confirmed) {
            try {
                await rabbitMQ.publish('order.created', {
                    orderId: updatedOrder.id,
                    shopId: updatedOrder.shopId,
                    userId: updatedOrder.userId,
                    items: updatedOrder.items,
                    total: updatedOrder.total
                });
            } catch (error) {
                console.error('OrderService: Failed to publish event', error);
            }
        }

        if (status === OrderStatus.ready) {
            await rabbitMQ.publish('order.ready', {
                orderId: updatedOrder.id,
                shopId: updatedOrder.shopId,
                userId: updatedOrder.userId,
                items: updatedOrder.items,
                total: updatedOrder.total
            });
        }

        return updatedOrder;
    }
}
