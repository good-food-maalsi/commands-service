import { AppRoutes } from "./src/app.routes.js";
import { Elysia } from "elysia";

const app = new Elysia({ prefix: "/commands" }).use(AppRoutes);

console.log("Registered routes:");
app.routes.forEach((route) => {
    console.log(`${route.method} ${route.path}`);
});
