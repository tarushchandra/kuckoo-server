/*
  Warnings:

  - You are about to drop the column `authorId` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `tweetId` on the `Comment` table. All the data in the column will be lost.
  - The primary key for the `CommentLike` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `commentId` on the `CommentLike` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `CommentLike` table. All the data in the column will be lost.
  - The primary key for the `Follows` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `followerId` on the `Follows` table. All the data in the column will be lost.
  - You are about to drop the column `followingId` on the `Follows` table. All the data in the column will be lost.
  - The primary key for the `ReplyComment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `parentCommentId` on the `ReplyComment` table. All the data in the column will be lost.
  - You are about to drop the column `replyCommentId` on the `ReplyComment` table. All the data in the column will be lost.
  - You are about to drop the column `authorId` on the `Tweet` table. All the data in the column will be lost.
  - The primary key for the `TweetEngagement` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `tweetId` on the `TweetEngagement` table. All the data in the column will be lost.
  - The primary key for the `TweetLike` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `tweetId` on the `TweetLike` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `TweetLike` table. All the data in the column will be lost.
  - Added the required column `author_id` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `comment_id` to the `CommentLike` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `CommentLike` table without a default value. This is not possible if the table is not empty.
  - Added the required column `follower_id` to the `Follows` table without a default value. This is not possible if the table is not empty.
  - Added the required column `following_id` to the `Follows` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parent_comment_id` to the `ReplyComment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reply_comment_id` to the `ReplyComment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `author_id` to the `Tweet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tweet_id` to the `TweetEngagement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tweet_id` to the `TweetLike` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `TweetLike` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_tweetId_fkey";

-- DropForeignKey
ALTER TABLE "CommentLike" DROP CONSTRAINT "CommentLike_commentId_fkey";

-- DropForeignKey
ALTER TABLE "CommentLike" DROP CONSTRAINT "CommentLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "Follows" DROP CONSTRAINT "Follows_followerId_fkey";

-- DropForeignKey
ALTER TABLE "Follows" DROP CONSTRAINT "Follows_followingId_fkey";

-- DropForeignKey
ALTER TABLE "ReplyComment" DROP CONSTRAINT "ReplyComment_replyCommentId_fkey";

-- DropForeignKey
ALTER TABLE "Tweet" DROP CONSTRAINT "Tweet_authorId_fkey";

-- DropForeignKey
ALTER TABLE "TweetEngagement" DROP CONSTRAINT "TweetEngagement_tweetId_fkey";

-- DropForeignKey
ALTER TABLE "TweetLike" DROP CONSTRAINT "TweetLike_tweetId_fkey";

-- DropForeignKey
ALTER TABLE "TweetLike" DROP CONSTRAINT "TweetLike_userId_fkey";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "authorId",
DROP COLUMN "tweetId",
ADD COLUMN     "author_id" TEXT NOT NULL,
ADD COLUMN     "tweet_id" TEXT;

-- AlterTable
ALTER TABLE "CommentLike" DROP CONSTRAINT "CommentLike_pkey",
DROP COLUMN "commentId",
DROP COLUMN "userId",
ADD COLUMN     "comment_id" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL,
ADD CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("user_id", "comment_id");

-- AlterTable
ALTER TABLE "Follows" DROP CONSTRAINT "Follows_pkey",
DROP COLUMN "followerId",
DROP COLUMN "followingId",
ADD COLUMN     "follower_id" TEXT NOT NULL,
ADD COLUMN     "following_id" TEXT NOT NULL,
ADD CONSTRAINT "Follows_pkey" PRIMARY KEY ("follower_id", "following_id");

-- AlterTable
ALTER TABLE "ReplyComment" DROP CONSTRAINT "ReplyComment_pkey",
DROP COLUMN "parentCommentId",
DROP COLUMN "replyCommentId",
ADD COLUMN     "parent_comment_id" TEXT NOT NULL,
ADD COLUMN     "reply_comment_id" TEXT NOT NULL,
ADD CONSTRAINT "ReplyComment_pkey" PRIMARY KEY ("parent_comment_id", "reply_comment_id");

-- AlterTable
ALTER TABLE "Tweet" DROP COLUMN "authorId",
ADD COLUMN     "author_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TweetEngagement" DROP CONSTRAINT "TweetEngagement_pkey",
DROP COLUMN "tweetId",
ADD COLUMN     "tweet_id" TEXT NOT NULL,
ADD CONSTRAINT "TweetEngagement_pkey" PRIMARY KEY ("tweet_id");

-- AlterTable
ALTER TABLE "TweetLike" DROP CONSTRAINT "TweetLike_pkey",
DROP COLUMN "tweetId",
DROP COLUMN "userId",
ADD COLUMN     "tweet_id" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL,
ADD CONSTRAINT "TweetLike_pkey" PRIMARY KEY ("user_id", "tweet_id");

-- AddForeignKey
ALTER TABLE "Follows" ADD CONSTRAINT "Follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follows" ADD CONSTRAINT "Follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tweet" ADD CONSTRAINT "Tweet_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TweetEngagement" ADD CONSTRAINT "TweetEngagement_tweet_id_fkey" FOREIGN KEY ("tweet_id") REFERENCES "Tweet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TweetLike" ADD CONSTRAINT "TweetLike_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TweetLike" ADD CONSTRAINT "TweetLike_tweet_id_fkey" FOREIGN KEY ("tweet_id") REFERENCES "TweetEngagement"("tweet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_tweet_id_fkey" FOREIGN KEY ("tweet_id") REFERENCES "TweetEngagement"("tweet_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyComment" ADD CONSTRAINT "ReplyComment_reply_comment_id_fkey" FOREIGN KEY ("reply_comment_id") REFERENCES "Comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "Comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
