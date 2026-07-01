-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_login_at" TIMESTAMPTZ(3),
ADD COLUMN     "last_password_change_at" TIMESTAMPTZ(3);
