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
                    description: 'API for managing orders in the Good Food ecosystem.',
                    version: '1.0.0',
                },
            },
        }),
    )
    .use(AppRoutes);

app.listen({ port: env.PORT });

console.log(
    `🦊 Elysia is running`,
);