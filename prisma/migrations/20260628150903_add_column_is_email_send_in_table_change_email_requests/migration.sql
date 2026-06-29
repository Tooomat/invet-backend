-- DropIndex
DROP INDEX "email_change_requests_new_email_key";

-- AlterTable
ALTER TABLE "email_change_requests" ADD COLUMN     "is_email_sent" BOOLEAN NOT NULL DEFAULT false;
