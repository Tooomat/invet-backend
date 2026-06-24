-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatusUser" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "StatusInvitation" AS ENUM ('DRAFTED', 'PUBLISHED', 'ARCHIVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EventName" AS ENUM ('RESEPSI', 'ACARA_PERNIKAHAN');

-- CreateEnum
CREATE TYPE "Attendance" AS ENUM ('PRESENT', 'NOT_PRESENT');

-- CreateEnum
CREATE TYPE "CategoryGuest" AS ENUM ('FAMILY', 'FRIEND', 'OFFICE', 'VIP');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "StatusUser" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" VARCHAR(20),
    "password" TEXT NOT NULL,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "music_url" TEXT,
    "preview_image" TEXT,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "StatusInvitation" NOT NULL DEFAULT 'DRAFTED',
    "custom_music_url" TEXT,
    "prewedding_url" TEXT,
    "livestream_url" TEXT,
    "expired_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couples" (
    "id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "hero_image" TEXT,
    "groom_full_name" TEXT NOT NULL,
    "groom_nickname" TEXT NOT NULL,
    "groom_father" TEXT NOT NULL,
    "groom_mother" TEXT NOT NULL,
    "groom_photo" TEXT,
    "groom_ig_url" TEXT,
    "bride_full_name" TEXT NOT NULL,
    "bride_nickname" TEXT NOT NULL,
    "bride_father" TEXT NOT NULL,
    "bride_mother" TEXT NOT NULL,
    "bride_photo" TEXT,
    "bride_ig_url" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),

    CONSTRAINT "couples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "address_id" TEXT NOT NULL,
    "name" "EventName" NOT NULL,
    "event_date" DATE NOT NULL,
    "start" TIMESTAMPTZ(3) NOT NULL,
    "end" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "subdistrict_id" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "postal_code" VARCHAR(10) NOT NULL,
    "maps_url" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_provinces" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(20) NOT NULL,

    CONSTRAINT "master_provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_cities" (
    "id" TEXT NOT NULL,
    "province_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "province" JSONB NOT NULL,

    CONSTRAINT "master_cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_districts" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "province" JSONB NOT NULL,
    "city" JSONB NOT NULL,

    CONSTRAINT "master_districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_subdistricts" (
    "id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "province" JSONB NOT NULL,
    "city" JSONB NOT NULL,
    "district" JSONB NOT NULL,

    CONSTRAINT "master_subdistricts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "galleries" (
    "id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),

    CONSTRAINT "galleries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "our_stories" (
    "id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "story_date" DATE,
    "image_url1" TEXT,
    "image_url2" TEXT,
    "image_url3" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),

    CONSTRAINT "our_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "category" "CategoryGuest" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rsvps" (
    "id" TEXT NOT NULL,
    "guest_id" TEXT NOT NULL,
    "attendance" "Attendance" NOT NULL,
    "total_guest" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),

    CONSTRAINT "rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gifts" (
    "id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_holder" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),

    CONSTRAINT "gifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thank_you" (
    "id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "image_url" TEXT,
    "message" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3),

    CONSTRAINT "thank_you_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "templates_slug_key" ON "templates"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_slug_key" ON "invitations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "couples_invitation_id_key" ON "couples"("invitation_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_invitation_id_name_key" ON "events"("invitation_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "master_provinces_code_key" ON "master_provinces"("code");

-- CreateIndex
CREATE UNIQUE INDEX "master_cities_code_key" ON "master_cities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "master_districts_code_key" ON "master_districts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "master_subdistricts_code_key" ON "master_subdistricts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "galleries_invitation_id_image_url_key" ON "galleries"("invitation_id", "image_url");

-- CreateIndex
CREATE UNIQUE INDEX "our_stories_invitation_id_title_key" ON "our_stories"("invitation_id", "title");

-- CreateIndex
CREATE UNIQUE INDEX "guests_phone_key" ON "guests"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "rsvps_guest_id_key" ON "rsvps"("guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "gifts_account_number_key" ON "gifts"("account_number");

-- CreateIndex
CREATE UNIQUE INDEX "thank_you_invitation_id_key" ON "thank_you"("invitation_id");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couples" ADD CONSTRAINT "couples_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_subdistrict_id_fkey" FOREIGN KEY ("subdistrict_id") REFERENCES "master_subdistricts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_cities" ADD CONSTRAINT "master_cities_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "master_provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_districts" ADD CONSTRAINT "master_districts_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "master_cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_subdistricts" ADD CONSTRAINT "master_subdistricts_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "master_districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "our_stories" ADD CONSTRAINT "our_stories_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thank_you" ADD CONSTRAINT "thank_you_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
