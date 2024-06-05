/*
  Warnings:

  - Added the required column `updated_at` to the `Chat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `ChatMembership` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ChatMembership" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;
