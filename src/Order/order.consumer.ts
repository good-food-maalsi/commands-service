import { rabbitMQ } from "../Utils/rabbitmq.js";
import { OrderService } from "./order.service.js";
import { PrismaClient } from "@prisma/client";

// Instantiate a separate prisma client or reuse a global one if available appropriately. 
// For simplicity in this consumer context, we'll create a new instance or imported singleton if specific plugin structure wasn't strictly enforced for standalone scripts.
// However, looking at app structure, we can instantiate it.
const prisma = new PrismaClient();
const orderService = new OrderService(prisma);

export const startOrderConsumers = async () => {
    await rabbitMQ.subscribe('order.new', async (message: any) => {
        console.log('Received new order message:', message);
        try {
            // Assuming message structure matches CreateOrderDTO
            // We might need to map it if it differs
            await orderService.create(message, message.userId);
            console.log(`Order created from message for user ${message.userId}`);
        } catch (error) {
            console.error('Error creating order from message:', error);
            // In a real world scenario, we might want to DLQ this or retry
        }
    });
};
