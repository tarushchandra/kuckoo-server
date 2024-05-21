import { Comment } from "@prisma/client";
import { prismaClient } from "../clients/prisma";
import UserService from "./user";

export class TweetEngagementService {
  public static async getTweetEngagement(tweetId: string) {
    try {
      const result = await prismaClient.tweetEngagement.findUnique({
        where: {
          tweetId,
        },
        include: {
          tweet: true,
          likes: {
            include: {
              user: true,
              tweetEngagement: { include: { tweet: true } },
            },
          },
        },
      });

      return result;
    } catch (err) {
      return err;
    }
  }

  private static async createTweetEngagement(tweetId: string) {
    return prismaClient.tweetEngagement.create({
      data: {
        tweet: { connect: { id: tweetId } },
      },
    });
  }

  private static async deleteTweetEngagement(tweetId: string) {
    return prismaClient.tweetEngagement.delete({
      where: { tweetId },
    });
  }

  private static async checkOrCreateTweetEngagement(tweetId: string) {
    const foundTweetEngagement =
      await TweetEngagementService.getTweetEngagement(tweetId);
    if (!foundTweetEngagement)
      await TweetEngagementService.createTweetEngagement(tweetId);
  }

  private static async checkOrDeleteTweetEngagement(tweetId: string) {
    const likesCount = await TweetEngagementService.getLikesCount(tweetId);
    const commentsCount = await TweetEngagementService.getCommentsCount(
      tweetId
    );
    if (likesCount === 0 && commentsCount === 0)
      await TweetEngagementService.deleteTweetEngagement(tweetId);
  }

  // ----------------------------------------------------------------------------------

  public static async likeTweet(sessionUserId: string, tweetId: string) {
    try {
      await TweetEngagementService.checkOrCreateTweetEngagement(tweetId);
      await prismaClient.tweetLike.create({
        data: {
          user: { connect: { id: sessionUserId } },
          tweetEngagement: { connect: { tweetId } },
        },
      });
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async dislikeTweet(sessionUserId: string, tweetId: string) {
    try {
      await prismaClient.tweetLike.delete({
        where: {
          userId_tweetId: { tweetId, userId: sessionUserId },
        },
      });
      await TweetEngagementService.checkOrDeleteTweetEngagement(tweetId);
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async isLikeExist(userId: string, tweetId: string) {
    try {
      const result = await prismaClient.tweetLike.findUnique({
        where: { userId_tweetId: { tweetId, userId } },
      });
      if (!result) return false;
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async getLikes(sessionUserId: string, tweetId: string) {
    try {
      const result = await prismaClient.tweetLike.findMany({
        where: { tweetId },
        include: {
          user: { include: { followings: { include: { follower: true } } } },
        },
      });

      const likes = result.map((like) => like.user);
      const rearrangedLikes =
        UserService.getRearrangedConnectionsBasedOnSessionUser(
          sessionUserId,
          likes
        );

      return rearrangedLikes;
    } catch (err) {
      return err;
    }
  }

  public static async getMutualLikers(sessionUserId: string, tweetId: string) {
    try {
      const result = await prismaClient.tweetLike.findMany({
        where: { tweetId },
        include: {
          user: { include: { followings: { include: { follower: true } } } },
        },
      });

      const likes = result.map((like) => like.user);
      const mutualLikes = UserService.getMutualConnections(
        sessionUserId,
        likes
      );

      return mutualLikes;
    } catch (err) {
      return err;
    }
  }

  public static async getLikesCount(tweetId: string) {
    try {
      const result = await prismaClient.tweetLike.findMany({
        where: { tweetId },
      });
      return result.length;
    } catch (err) {
      return err;
    }
  }

  // ----------------------------------------------------------------------------------

  public static async createCommentOnTweet(
    sessionUserId: string,
    content: string,
    tweetId: string
  ) {
    try {
      await TweetEngagementService.checkOrCreateTweetEngagement(tweetId);

      await prismaClient.comment.create({
        data: {
          content,
          tweetEngagement: { connect: { tweetId } },
          author: { connect: { id: sessionUserId } },
        },
      });
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async deleteComment(
    sessionUserId: string,
    tweetId: string,
    commentId: string
  ) {
    try {
      await prismaClient.comment.delete({
        where: { id: commentId, authorId: sessionUserId, tweetId },
      });
      await TweetEngagementService.checkOrDeleteTweetEngagement(tweetId);
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async updateComment(
    sessionUserId: string,
    commentId: string,
    content: string
  ) {
    try {
      await prismaClient.comment.update({
        where: { id: commentId, authorId: sessionUserId },
        data: {
          content,
          updatedAt: new Date(Date.now()),
        },
      });
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async getComment(tweetId: string, commentId: string) {
    return prismaClient.comment.findUnique({
      where: { id: commentId, tweetId },
      include: { repliedTo: { include: { author: true } } },
    });
  }

  public static async getComments(tweetId: string) {
    try {
      const result = await prismaClient.comment.findMany({
        where: { tweetId, parentCommentId: null },
      });
      result.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      return result;
    } catch (err) {
      return err;
    }
  }

  public static async getCommentsCount(tweetId: string) {
    try {
      const result = await prismaClient.comment.findMany({
        where: { tweetId },
      });
      return result.length;
    } catch (err) {
      return err;
    }
  }

  public static async likeComment(sessionUserId: string, commentId: string) {
    try {
      await prismaClient.commentLike.create({
        data: {
          user: { connect: { id: sessionUserId } },
          comment: { connect: { id: commentId } },
        },
      });
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async dislikeComment(sessionUserId: string, commentId: string) {
    try {
      await prismaClient.commentLike.delete({
        where: { userId_commentId: { userId: sessionUserId, commentId } },
      });
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async getCommentLikesCount(commentId: string) {
    try {
      const result = await prismaClient.commentLike.findMany({
        where: { commentId },
      });
      return result.length;
    } catch (err) {
      return err;
    }
  }

  public static async isCommentLikedBySessionUser(
    sessionUserId: string,
    commentId: string
  ) {
    try {
      const result = await prismaClient.commentLike.findUnique({
        where: { userId_commentId: { userId: sessionUserId, commentId } },
      });
      if (!result) return false;
      return true;
    } catch (err) {
      return err;
    }
  }

  // ----------------------------------------------

  public static async addReplyToComment(
    sessionUserId: string,
    tweetId: string,
    commentId: string,
    content: string
  ) {
    try {
      const comment = await TweetEngagementService.getComment(
        tweetId,
        commentId
      );
      if (!comment) throw new Error("Parent comment not found");

      if (!comment.parentCommentId) {
        await prismaClient.comment.create({
          data: {
            tweetEngagement: { connect: { tweetId } },
            content,
            author: { connect: { id: sessionUserId } },
            parentComment: { connect: { id: commentId } },
            repliedTo: { connect: { id: commentId } },
          },
        });
        return true;
      }

      await prismaClient.comment.create({
        data: {
          tweetEngagement: { connect: { tweetId } },
          content,
          author: { connect: { id: sessionUserId } },
          parentComment: { connect: { id: comment.parentCommentId } },
          repliedTo: { connect: { id: commentId } },
        },
      });
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async getCommentsOfComment(commentId: string, tweetId: string) {
    try {
      const result = await prismaClient.comment.findMany({
        where: { parentCommentId: commentId, tweetId },
      });
      result.sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
      return result;
    } catch (err) {
      return err;
    }
  }

  public static async getParentComment(commentId: string) {
    try {
      const comment = await prismaClient.comment.findUnique({
        where: { id: commentId },
        include: { parentComment: true },
      });
      return comment?.parentComment;
    } catch (err) {
      return err;
    }
  }

  public static async getCommentsCountOfComment(
    commentId: string,
    tweetId: string
  ) {
    try {
      const result = await prismaClient.comment.findMany({
        where: { parentCommentId: commentId, tweetId },
      });
      return result.length;
    } catch (err) {
      return err;
    }
  }
}
