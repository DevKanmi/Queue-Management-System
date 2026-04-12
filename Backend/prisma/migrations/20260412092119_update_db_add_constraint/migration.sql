/*
  Warnings:

  - A unique constraint covering the columns `[guest_token]` on the table `QueueEntry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[join_code]` on the table `Session` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "QueueEntry" DROP CONSTRAINT "QueueEntry_student_id_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_department_id_fkey";

-- AlterTable
ALTER TABLE "QueueEntry" ADD COLUMN     "confirmation_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "guest_email" TEXT,
ADD COLUMN     "guest_name" TEXT,
ADD COLUMN     "guest_phone" TEXT,
ADD COLUMN     "guest_token" TEXT,
ALTER COLUMN "student_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "join_code" TEXT,
ADD COLUMN     "org_id" TEXT,
ALTER COLUMN "department_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMember" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMember_org_id_user_id_key" ON "OrgMember"("org_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "QueueEntry_guest_token_key" ON "QueueEntry"("guest_token");

-- CreateIndex
CREATE UNIQUE INDEX "Session_join_code_key" ON "Session"("join_code");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
