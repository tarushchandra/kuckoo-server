import { Comment, NotificationType } from "@prisma/client";
import { prismaClient } from "../clients/prisma";
import UserService from "./user";
import { NotificationService } from "./notification";

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
      const tweetLike = await prismaClient.tweetLike.create({
        data: {
          user: { connect: { id: sessionUserId } },
          tweetEngagement: { connect: { tweetId } },
        },
        include: {
          tweetEngagement: {
            include: { tweet: true },
          },
        },
      });

      // create notification
      await NotificationService.createNotification(
        NotificationType.LIKE_ON_TWEET,
        sessionUserId,
        tweetLike.tweetEngagement.tweet.authorId,
        { tweetId }
      );

      return true;
    } catch (err) {
      return err;
    }
  }

  public static async dislikeTweet(sessionUserId: string, tweetId: string) {
    try {
      const tweetLike = await prismaClient.tweetLike.delete({
        where: {
          userId_tweetId: { tweetId, userId: sessionUserId },
        },
        include: { tweetEngagement: { include: { tweet: true } } },
      });
      await TweetEngagementService.checkOrDeleteTweetEngagement(tweetId);

      // delete notification
      await NotificationService.deleteNotification(
        NotificationType.LIKE_ON_TWEET,
        sessionUserId,
        tweetLike.tweetEngagement.tweet.authorId,
        { tweetId }
      );
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

      const comment = await prismaClient.comment.create({
        data: {
          content,
          tweetEngagement: { connect: { tweetId } },
          author: { connect: { id: sessionUserId } },
        },
        include: {
          tweetEngagement: {
            include: { tweet: true },
          },
        },
      });

      // create notification
      await NotificationService.createNotification(
        NotificationType.COMMENT_ON_TWEET,
        sessionUserId,
        comment.tweetEngagement.tweet.authorId,
        { tweetId, commentId: comment.id }
      );

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
      const comment = await prismaClient.comment.delete({
        where: { id: commentId, authorId: sessionUserId, tweetId },
        include: {
          tweetEngagement: { include: { tweet: true } },
          parentComment: true,
        },
      });

      await TweetEngagementService.checkOrDeleteTweetEngagement(tweetId);

      // delete notification
      if (!comment.parentCommentId) {
        await NotificationService.deleteNotification(
          NotificationType.COMMENT_ON_TWEET,
          sessionUserId,
          comment.tweetEngagement.tweet.authorId,
          { tweetId, commentId: comment.id }
        );
      } else {
        await NotificationService.deleteNotification(
          NotificationType.REPLY_ON_COMMENT,
          sessionUserId,
          comment.parentComment?.authorId!,
          {
            tweetId,
            commentId: comment.parentCommentId,
            repliedCommentId: comment.id,
          }
        );
      }

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

  public static async getComments(sessionUserId: string, tweetId: string) {
    try {
      const result = await prismaClient.comment.findMany({
        where: { tweetId, parentCommentId: null },
      });
      result.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

      const commentsOfSessionUser = result.filter(
        (comment) => comment.authorId === sessionUserId
      );
      const remainingComments = result.filter(
        (comment) => comment.authorId !== sessionUserId
      );

      if (commentsOfSessionUser.length === 0) return remainingComments;
      return [...commentsOfSessionUser, ...remainingComments];
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
      const commentLike = await prismaClient.commentLike.create({
        data: {
          user: { connect: { id: sessionUserId } },
          comment: { connect: { id: commentId } },
        },
        include: { comment: true },
      });

      // create notification
      await NotificationService.createNotification(
        NotificationType.LIKE_ON_COMMENT,
        sessionUserId,
        commentLike.comment.authorId,
        { tweetId: commentLike.comment.tweetId, commentId }
      );

      return true;
    } catch (err) {
      return err;
    }
  }

  public static async dislikeComment(sessionUserId: string, commentId: string) {
    try {
      const commentLike = await prismaClient.commentLike.delete({
        where: { userId_commentId: { userId: sessionUserId, commentId } },
        include: { comment: true },
      });

      // delete notification
      await NotificationService.deleteNotification(
        NotificationType.LIKE_ON_COMMENT,
        sessionUserId,
        commentLike.comment.authorId,
        { tweetId: commentLike.comment.tweetId }
      );

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

      let repliedComment;
      if (!comment.parentCommentId) {
        repliedComment = await prismaClient.comment.create({
          data: {
            tweetEngagement: { connect: { tweetId } },
            content,
            author: { connect: { id: sessionUserId } },
            parentComment: { connect: { id: commentId } },
            repliedTo: { connect: { id: commentId } },
          },
        });
      } else {
        repliedComment = await prismaClient.comment.create({
          data: {
            tweetEngagement: { connect: { tweetId } },
            content,
            author: { connect: { id: sessionUserId } },
            parentComment: { connect: { id: comment.parentCommentId } },
            repliedTo: { connect: { id: commentId } },
          },
        });
      }

      // create notification
      await NotificationService.createNotification(
        NotificationType.REPLY_ON_COMMENT,
        sessionUserId,
        comment.authorId,
        { tweetId, commentId, repliedCommentId: repliedComment.id }
      );

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

  // ---------------------------------------------------------------------------------

  public static async createBookmark(sessionUserId: string, tweetId: string) {
    try {
      await TweetEngagementService.checkOrCreateTweetEngagement(tweetId);
      await prismaClient.bookmark.create({
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

  public static async removeBookmark(sessionUserId: string, tweetId: string) {
    try {
      await prismaClient.bookmark.delete({
        where: { userId_tweetId: { userId: sessionUserId, tweetId } },
      });
      await TweetEngagementService.checkOrDeleteTweetEngagement(tweetId);
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async getBookmarks(sessionUserId: string) {
    try {
      const result = await prismaClient.bookmark.findMany({
        where: { userId: sessionUserId },
        include: { tweetEngagement: { include: { tweet: true } } },
      });
      return result.map((bookmark) => bookmark.tweetEngagement.tweet);
    } catch (err) {
      return err;
    }
  }

  public static async isTweetBookmarkedBySessionUser(
    sessionUserId: string,
    tweetId: string
  ) {
    try {
      const result = await prismaClient.bookmark.findUnique({
        where: { userId_tweetId: { userId: sessionUserId, tweetId } },
      });
      if (!result) return false;
      return true;
    } catch (err) {
      return err;
    }
  }
}
