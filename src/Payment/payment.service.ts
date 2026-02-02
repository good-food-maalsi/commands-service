import { PaymentMethod, PaymentStatus } from "@prisma/client";

export class PaymentService {
    // In a real app, this would integrate with Stripe, PayPal, etc.
    async processPayment(orderId: string, amount: number, method: string): Promise<{ status: PaymentStatus, transactionId: string }> {
        console.log(`Processing payment for Order ${orderId} via ${method} for ${amount}`);

        // Mock Logic: 
        // - "card" always succeeds
        // - "paypal" fails if amount > 1000
        // - Others pending

        if (method === "card") {
            return {
                status: "completed",
                transactionId: `txn_${Math.random().toString(36).substring(7)}`
            };
        }

        if (method === "paypal") {
            if (amount > 1000) {
                return {
                    status: "failed",
                    transactionId: `txn_fail_${Math.random().toString(36).substring(7)}`
                };
            }
            return {
                status: "completed",
                transactionId: `txn_pp_${Math.random().toString(36).substring(7)}`
            };
        }

        return {
            status: "pending",
            transactionId: `txn_pending_${Math.random().toString(36).substring(7)}`
        };
    }
}
