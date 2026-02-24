import { Elysia } from "elysia";

import { OrderController } from "./Order/order.controller.js";
import { prismaPlugin } from "./Plugin/prisma.js";

const routes = new Elysia({ prefix: "/commands" })
    .use(prismaPlugin)
    .use(OrderController);

export { routes as AppRoutes };
