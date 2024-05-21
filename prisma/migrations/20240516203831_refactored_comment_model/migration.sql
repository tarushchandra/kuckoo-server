/*
  Warnings:

  - You are about to drop the `ReplyComment` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `tweet_id` on table `Comment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_tweet_id_fkey";

-- DropForeignKey
ALTER TABLE "ReplyComment" DROP CONSTRAINT "ReplyComment_reply_comment_id_fkey";

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "parentCommentId" TEXT,
ALTER COLUMN "tweet_id" SET NOT NULL;

-- DropTable
DROP TABLE "ReplyComment";

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_tweet_id_fkey" FOREIGN KEY ("tweet_id") REFERENCES "TweetEngagement"("tweet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
