import { Elysia, t } from "elysia";
import { OrderService } from "./order.service.js";
import { CreateOrderDTO, UpdateOrderStatusDTO, UpdateOrderItemsDTO, AddOrderItemDTO } from "./dto/order.dto.js";
import { createAuthMiddleware, Role } from "../Middleware/auth.middleware.js";

export const OrderController = new Elysia({ prefix: "/orders" })
  .use(
    createAuthMiddleware({
      allowedRoles: [Role.ADMIN, Role.STAFF, Role.CUSTOMER],
    }),
  )
  .decorate({
    getOrderService: (db: any) => new OrderService(db),
  })
  // Protected: ADMIN/STAFF see all orders; CUSTOMER (and others) see only their orders
  .get("/", async (context: any) => {
    const { db, getOrderService, user } = context;

    // Check authentication
    if (!user) {
      context.set.status = 401;
      return { message: "Unauthorized - Authentication required" };
    }

    const userRoles = user.roles || [];
    const isAdminOrStaff = userRoles.some(
      (role: any) => role === Role.ADMIN || role === Role.STAFF,
    );

    if (isAdminOrStaff) {
      return getOrderService(db).getAll();
    }

    // CUSTOMER or other roles: only their own orders
    return getOrderService(db).getByUserId(user.id);
  })
  // Protected: ADMIN/STAFF or owning customer can view a specific order
  .get("/:id", async (context: any) => {
    const {
      db,
      getOrderService,
      params: { id },
      user,
    } = context;

    // Check authentication
    if (!user) {
      context.set.status = 401;
      return { message: "Unauthorized - Authentication required" };
    }

    const order = await getOrderService(db).getById(id);
    if (!order) {
      context.set.status = 404;
      return { message: "Order not found" };
    }

    const userRoles = user.roles || [];
    const isStaffOrAdmin = userRoles.some(
      (role: any) => role === Role.ADMIN || role === Role.STAFF,
    );

    const isOwner = order.userId && order.userId === user.id;

    if (!isStaffOrAdmin && !isOwner) {
      context.set.status = 403;
      return {
        message:
          "Forbidden - Only ADMIN, STAFF or owning customer can access this order",
        required: [Role.ADMIN, Role.STAFF],
        actual: userRoles,
      };
    }

    return order;
  })
  // Protected: Authenticated users can create orders
  .post(
    "/",
    async (context: any) => {
      const { db, getOrderService, body, user } = context;

      // Check authentication
      if (!user) {
        context.set.status = 401;
        return { message: "Unauthorized - Authentication required" };
      }

      const result = await getOrderService(db).create(body, user.id);

      context.set.status = 201;
      const data = {
        ...result,
        total: Number(result.total),
        items: result.items.map((i: any) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
        })),
      };
      return { message: "Order created", data };
    },
    {
      body: CreateOrderDTO,
    },
  )
  // Protected: Owner or ADMIN/STAFF can add an item to a draft order
  .post(
    "/:id/items",
    async (context: any) => {
      const { db, getOrderService, params, body, user } = context;

      console.log("\n[ORDER CONTROLLER] POST /:id/items (add item)");
      console.log("[ORDER CONTROLLER] Order ID:", params.id);
      console.log("[ORDER CONTROLLER] Item:", body.itemId, "x", body.quantity);

      if (!user) {
        console.log("[ORDER CONTROLLER] ❌ 401 Unauthorized");
        context.set.status = 401;
        return { message: "Unauthorized - Authentication required" };
      }

      // Get the order to check ownership and status
      const order = await getOrderService(db).getById(params.id);
      if (!order) {
        console.log("[ORDER CONTROLLER] ❌ 404 Order not found");
        context.set.status = 404;
        return { message: "Order not found" };
      }

      // Only draft orders can be updated
      if (order.status !== "draft") {
        console.log("[ORDER CONTROLLER] ❌ 400 Order not in draft status");
        context.set.status = 400;
        return { message: "Can only add items to draft orders" };
      }

      const userRoles = user.roles || [];
      const isAdminOrStaff = userRoles.some(
        (role: any) => role === Role.ADMIN || role === Role.STAFF
      );
      const isOwner = order.userId && order.userId === user.id;

      if (!isAdminOrStaff && !isOwner) {
        console.log("[ORDER CONTROLLER] ❌ 403 Forbidden");
        context.set.status = 403;
        return {
          message: "Forbidden - Only order owner or ADMIN/STAFF can add items",
        };
      }

      console.log("[ORDER CONTROLLER] ✅ Adding item to order:", params.id);
      const result = await getOrderService(db).addItem(params.id, body);
      console.log("[ORDER CONTROLLER] ✅ Item added, new total:", result.total);

      const data = {
        ...result,
        total: Number(result.total),
        items: result.items.map((i: any) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
        })),
      };

      return { message: "Item added to order", data };
    },
    {
      body: AddOrderItemDTO,
    }
  )
  // Protected: Owner or ADMIN/STAFF can update items of a draft order
  .patch(
    "/:id/items",
    async (context: any) => {
      const { db, getOrderService, params, body, user } = context;

      console.log("\n[ORDER CONTROLLER] PATCH /:id/items");
      console.log("[ORDER CONTROLLER] Order ID:", params.id);
      console.log("[ORDER CONTROLLER] User:", user ? `${user.id}` : "❌ NOT AUTHENTICATED");

      if (!user) {
        console.log("[ORDER CONTROLLER] ❌ 401 Unauthorized");
        context.set.status = 401;
        return { message: "Unauthorized - Authentication required" };
      }

      // Get the order to check ownership and status
      const order = await getOrderService(db).getById(params.id);
      if (!order) {
        console.log("[ORDER CONTROLLER] ❌ 404 Order not found");
        context.set.status = 404;
        return { message: "Order not found" };
      }

      // Only draft orders can be updated
      if (order.status !== "draft") {
        console.log("[ORDER CONTROLLER] ❌ 400 Order not in draft status");
        context.set.status = 400;
        return { message: "Can only update items of draft orders" };
      }

      const userRoles = user.roles || [];
      const isAdminOrStaff = userRoles.some(
        (role: any) => role === Role.ADMIN || role === Role.STAFF
      );
      const isOwner = order.userId && order.userId === user.id;

      if (!isAdminOrStaff && !isOwner) {
        console.log("[ORDER CONTROLLER] ❌ 403 Forbidden");
        context.set.status = 403;
        return {
          message: "Forbidden - Only order owner or ADMIN/STAFF can update items",
        };
      }

      console.log("[ORDER CONTROLLER] ✅ Updating items for order:", params.id);
      const result = await getOrderService(db).updateItems(params.id, body.items);
      console.log("[ORDER CONTROLLER] ✅ Items updated, new total:", result.total);

      const data = {
        ...result,
        total: Number(result.total),
        items: result.items.map((i: any) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
        })),
      };

      return { message: "Order items updated", data };
    },
    {
      body: UpdateOrderItemsDTO,
    }
  )
  // Protected: ADMIN/STAFF peuvent changer tout statut ; le client propriétaire peut passer sa commande en "confirmed"
  .patch(
    "/:id/status",
    async (context: any) => {
      const { db, getOrderService, params, body, user } = context;

      if (!user) {
        context.set.status = 401;
        return { message: "Unauthorized - Authentication required" };
      }

      const order = await getOrderService(db).getById(params.id);
      if (!order) {
        context.set.status = 404;
        return { message: "Order not found" };
      }

      const userRoles = user.roles || [];
      const isAdminOrStaff = userRoles.some(
        (role: any) => role === Role.ADMIN || role === Role.STAFF,
      );
      const isOwner = order.userId && order.userId === user.id;

      if (isAdminOrStaff) {
        return getOrderService(db).updateStatus(params.id, body.status);
      }

      if (isOwner && body.status === "confirmed") {
        return getOrderService(db).updateStatus(params.id, body.status);
      }

      context.set.status = 403;
      return {
        message:
          "Forbidden - Only ADMIN, STAFF or order owner can update status; owner can only set status to confirmed",
        required: [Role.ADMIN, Role.STAFF],
        actual: userRoles,
      };
    },
    {
      body: UpdateOrderStatusDTO,
    },
  );
