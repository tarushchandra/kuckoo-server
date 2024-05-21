/*
  Warnings:

  - You are about to drop the column `replied_to_user_id` on the `Comment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_replied_to_user_id_fkey";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "replied_to_user_id",
ADD COLUMN     "replied_to_comment_id" TEXT;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_replied_to_comment_id_fkey" FOREIGN KEY ("replied_to_comment_id") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
