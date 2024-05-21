-- AlterTable
ALTER TABLE "TweetComment" ADD COLUMN     "parent_comment_id" TEXT;

-- AddForeignKey
ALTER TABLE "TweetComment" ADD CONSTRAINT "TweetComment_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "TweetComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
