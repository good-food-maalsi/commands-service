import { describe, expect, it, mock, spyOn } from "bun:test";
import { OrderService } from "../src/Order/order.service.js";
import { PaymentService } from "../src/Payment/payment.service.js";
import { rabbitMQ } from "../src/Utils/rabbitmq.js";
import { catalogClient } from "../src/Utils/catalog.client.js";

// Mock deps
const mockDb = {
    order: {
        create: mock().mockResolvedValue({ id: 'order-123', status: 'draft' }),
        update: mock(async (args) => {
            return {
                id: 'order-123',
                status: args.data.status === 'completed' ? 'confirmed' : 'confirmed', // Simulate update to confirmed
                ...args.data
            }
        })
    }
} as any;

describe("OrderService", () => {
    it("should create an order successfully when items are available", async () => {
        // Mock sub-services
        const checkAvailabilitySpy = spyOn(catalogClient, 'checkAvailability').mockResolvedValue(true);
        const processPaymentSpy = spyOn(PaymentService.prototype, 'processPayment').mockResolvedValue({ status: 'completed', transactionId: 'txn_123' } as any);
        const publishSpy = spyOn(rabbitMQ, 'publish').mockResolvedValue();

        const service = new OrderService(mockDb);

        const orderData = {
            shopId: 'shop-1',
            items: [
                { itemId: 'item-1', quantity: 2, unitPrice: 10, selectedOptions: [] }
            ]
        } as any;

        const result = await service.create(orderData, 'user-1');

        expect(checkAvailabilitySpy).toHaveBeenCalled();
        expect(processPaymentSpy).toHaveBeenCalled();
        expect(mockDb.order.create).toHaveBeenCalled();
        expect(mockDb.order.update).toHaveBeenCalled();
        expect(publishSpy).toHaveBeenCalledWith('order.created', expect.any(Object));
        expect(result.status).toBe('confirmed');
    });

    it("should throw error if items not available", async () => {
        spyOn(catalogClient, 'checkAvailability').mockResolvedValue(false);
        const service = new OrderService(mockDb);

        const orderData = { shopId: 'shop-1', items: [{ itemId: 'item-1', quantity: 1, unitPrice: 10 }] } as any;

        expect(service.create(orderData)).rejects.toThrow("Items not available");
    });
});
