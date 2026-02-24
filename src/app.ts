import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";

import { AppRoutes } from "./app.routes.js";
import { env } from "./Utils/env.js";
import { rabbitMQ } from "./Utils/rabbitmq.js";
import { startOrderConsumers } from "./Order/order.consumer.js";

export const app = new Elysia({ prefix: "/commands" })
    .use(
        swagger({
            path: "/swagger",
            exclude: ["/swagger"],
            autoDarkMode: true,
            documentation: {
                info: {
                    title: "Commands Service API",
                    description:
                        "Microservice dedicated to order lifecycle management within the Good Food ecosystem. It handles order creation, payment processing (Stripe/Mock), real-time status updates via RabbitMQ, and inventory verification.",
                    version: "1.0.0",
                },
            },
        }),
    )
    .use(AppRoutes)
    .onError(({ code, error }) => {
        console.error("Global Error Handler:", code, error);
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
        });
    })
    .get("/health", () => "OK");

app.listen({ port: env.PORT }, async () => {
    console.log(
        `🦊 Commands Service is running at http://localhost:${env.PORT}`,
    );
    console.log(
        `📘 Swagger documentation: http://localhost:${env.PORT}/commands/swagger`,
    );

    await rabbitMQ.connect();
    await startOrderConsumers();
});

console.log(`🦊 Commands Service is running at http://localhost:${env.PORT}`);
console.log(
    `📘 Swagger documentation: http://localhost:${env.PORT}/commands/swagger`,
);
