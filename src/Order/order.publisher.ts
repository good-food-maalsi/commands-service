import { rabbitMQ } from "../Utils/rabbitmq.js";

export class OrderPublisher {
    async publishOrderValidatedAndPaid(payload: {
        orderId: string;
        shopId: string;
        userId: string | null;
        total: number;
        paymentStatus: string;
        paymentMethod: string | null;
        transactionId: string | null;
    }) {
        await rabbitMQ.publish("order.validated.paid", payload);
    }
}

export const orderPublisher = new OrderPublisher();
