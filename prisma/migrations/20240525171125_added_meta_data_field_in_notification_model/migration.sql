/*
  Warnings:

  - You are about to drop the column `tweet_id` on the `Notification` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_tweet_id_fkey";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "tweet_id",
ADD COLUMN     "metaData" JSONB;
