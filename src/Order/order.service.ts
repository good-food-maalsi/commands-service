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

        // 1. Create Order as Draft/Pending
        const order = await this.db.order.create({
            data: {
                total,
                status: OrderStatus.draft,
                shopId: data.shopId,
                userId: userId || null, // Inject userId
                paymentMethod: "card", // Default or passed in DTO
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

        // 2. Process Payment
        // Assuming 'card' for now, should be in DTO
        const paymentResult = await this.paymentService.processPayment(order.id, total, "card");

        // 3. Update Order with Payment Result
        const updatedOrder = await this.db.order.update({
            where: { id: order.id },
            data: {
                paymentStatus: paymentResult.status,
                transactionId: paymentResult.transactionId,
                status: paymentResult.status === "completed" ? OrderStatus.confirmed : OrderStatus.draft
            },
            include: {
                items: {
                    include: {
                        selectedOptions: true
                    }
                }
            }
        });

        // 4. Publish Event if Confirmed
        if (updatedOrder.status === OrderStatus.confirmed) {
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

        return updatedOrder;
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

    async updateStatus(id: string, status: any) { // Type to be refined with Prisma Enum
        const updatedOrder = await this.db.order.update({
            where: { id },
            data: { status },
            include: { items: true }
        });

        if (status === OrderStatus.ready) {
            await rabbitMQ.publish('order.ready', {
                orderId: updatedOrder.id,
                shopId: updatedOrder.shopId,
                userId: updatedOrder.userId,
                items: updatedOrder.items,
                total: updatedOrder.total
            })
        }

        return updatedOrder;
    }
}
