-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('draft', 'confirmed', 'preparation', 'ready', 'canceled');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('card', 'paypal', 'apple pay', 'google pay');

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_status" "OrderStatus" NOT NULL,
    "order_total" DECIMAL(10,2) NOT NULL,
    "delivery_id" UUID,
    "user_id" UUID,
    "shop_id" UUID NOT NULL,
    "payment_id" TEXT,
    "payment_method" "PaymentMethod",
    "payment_status" "PaymentStatus",
    "transaction_id" VARCHAR(255),
    "delivery_address" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "discount_id" UUID,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selected_options" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "additional_price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "selected_options_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selected_options" ADD CONSTRAINT "selected_options_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
