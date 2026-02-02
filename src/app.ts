import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';

import { AppRoutes } from './app.routes.js';
import { env } from './Utils/env.js';

const app = new Elysia()
    .use(
        swagger({
            path: '/swagger',
            exclude: ['/swagger'],
            autoDarkMode: true,
            documentation: {
                info: {
                    title: 'Commands Service API',
                    description: 'Microservice dedicated to order lifecycle management within the Good Food ecosystem. It handles order creation, payment processing (Stripe/Mock), real-time status updates via RabbitMQ, and inventory verification.',
                    version: '1.0.0',
                },
            },
        }),
    )
    .use(AppRoutes);

app.listen({ port: env.PORT });

console.log(
    `🦊 Commands Service is running at http://localhost:${env.PORT}`,
);
console.log(
    `📘 Swagger documentation: http://localhost:${env.PORT}/swagger`,
);