/*
  Warnings:

  - You are about to drop the column `name` on the `ChatActivity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChatActivity" DROP COLUMN "name",
ADD COLUMN     "metaData" JSONB;
