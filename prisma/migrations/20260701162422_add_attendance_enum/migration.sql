-- AlterEnum
ALTER TYPE "Attendance" ADD VALUE 'NOT_CHOOSING';

-- AlterTable
ALTER TABLE "rsvps" ALTER COLUMN "attendance" SET DEFAULT 'NOT_CHOOSING';
