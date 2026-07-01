/*
  Warnings:

  - You are about to drop the column `is_premium` on the `templates` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Packages" AS ENUM ('PACKAGE_A', 'PACKAGE_B', 'PACKAGE_C');

-- CreateEnum
CREATE TYPE "TemplateTag" AS ENUM ('BASIC', 'PREMIUM_1', 'PREMIUM_2', 'PREMIUM_3');

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "subscription_id" TEXT,
ADD COLUMN     "userSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "templates" DROP COLUMN "is_premium",
ADD COLUMN     "tag" "TemplateTag" NOT NULL DEFAULT 'BASIC';

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "name" "Packages" NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "has_rsvp" BOOLEAN NOT NULL DEFAULT false,
    "has_animation" BOOLEAN NOT NULL DEFAULT false,
    "has_auto_wa_blast" BOOLEAN NOT NULL DEFAULT false,
    "max_guests" INTEGER NOT NULL DEFAULT 0,
    "max_invitations" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_accessible_tiers" (
    "id" TEXT NOT NULL,
    "tier" "TemplateTag" NOT NULL,
    "package_id" TEXT NOT NULL,

    CONSTRAINT "package_accessible_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "expired_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),
    "user_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "custom_note" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" TEXT,
    "payment_ref" TEXT,
    "paid_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),
    "user_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "subscription_id" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_custom_templates" (
    "id" TEXT NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "assigned_by" TEXT,

    CONSTRAINT "user_custom_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "package_accessible_tiers_package_id_tier_key" ON "package_accessible_tiers"("package_id", "tier");

-- AddForeignKey
ALTER TABLE "package_accessible_tiers" ADD CONSTRAINT "package_accessible_tiers_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_custom_templates" ADD CONSTRAINT "user_custom_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_custom_templates" ADD CONSTRAINT "user_custom_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_custom_templates" ADD CONSTRAINT "user_custom_templates_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "user_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
