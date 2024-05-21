/*
  Warnings:

  - You are about to drop the column `nested_level` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `replied_user_id` on the `Comment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_replied_user_id_fkey";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "nested_level",
DROP COLUMN "replied_user_id",
ADD COLUMN     "replied_to_user_id" TEXT;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_replied_to_user_id_fkey" FOREIGN KEY ("replied_to_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
