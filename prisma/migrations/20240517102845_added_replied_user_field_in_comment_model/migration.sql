-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "nested_level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "replied_user_id" TEXT;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_replied_user_id_fkey" FOREIGN KEY ("replied_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
