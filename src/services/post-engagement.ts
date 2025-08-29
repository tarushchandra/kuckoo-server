import UserService from "./user";
import { NotificationService } from "./notification";
import { NotificationType } from "@prisma/client";
import { prismaClient } from "../clients/prisma";

export class PostEngagementService {
  public static async getPostEngagement(postId: string) {
    try {
      const result = await prismaClient.postEngagement.findUnique({
        where: {
          postId,
        },
        include: {
          post: true,
          likes: {
            include: {
              user: true,
              postEngagement: { include: { post: true } },
            },
          },
        },
      });

      return result;
    } catch (err) {
      return err;
    }
  }

  private static async createPostEngagement(postId: string) {
    return prismaClient.postEngagement.create({
      data: {
        post: { connect: { id: postId } },
      },
    });
  }

  private static async deletePostEngagement(postId: string) {
    return prismaClient.postEngagement.delete({
      where: { postId },
    });
  }

  private static async checkOrCreatePostEngagement(postId: string) {
    const foundPostEngagement = await PostEngagementService.getPostEngagement(
      postId
    );
    if (!foundPostEngagement)
      await PostEngagementService.createPostEngagement(postId);
  }

  private static async checkOrDeletePostEngagement(postId: string) {
    const likesCount = await PostEngagementService.getLikesCount(postId);
    const commentsCount = await PostEngagementService.getCommentsCount(postId);
    if (likesCount === 0 && commentsCount === 0)
      await PostEngagementService.deletePostEngagement(postId);
  }

  // ----------------------------------------------------------------------------------

  public static async likePost(sessionUserId: string, postId: string) {
    try {
      await PostEngagementService.checkOrCreatePostEngagement(postId);
      const postLike = await prismaClient.postLike.create({
        data: {
          user: { connect: { id: sessionUserId } },
          postEngagement: { connect: { postId } },
        },
        include: {
          postEngagement: {
            include: { post: true },
          },
        },
      });

      // create notification
      await NotificationService.createNotification(
        NotificationType.LIKE_ON_POST,
        sessionUserId,
        postLike.postEngagement.post.authorId,
        { postId }
      );

      return true;
    } catch (err) {
      return err;
    }
  }

  public static async dislikePost(sessionUserId: string, postId: string) {
    try {
      const postLike = await prismaClient.postLike.delete({
        where: {
          userId_postId: { postId, userId: sessionUserId },
        },
        include: { postEngagement: { include: { post: true } } },
      });
      await PostEngagementService.checkOrDeletePostEngagement(postId);

      // delete notification
      await NotificationService.deleteNotification(
        NotificationType.LIKE_ON_POST,
        sessionUserId,
        postLike.postEngagement.post.authorId,
        { postId }
      );
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async isLikeExist(userId: string, postId: string) {
    try {
      const result = await prismaClient.postLike.findUnique({
        where: { userId_postId: { postId, userId } },
      });
      if (!result) return false;
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async getLikes(sessionUserId: string, postId: string) {
    try {
      const result = await prismaClient.postLike.findMany({
        where: { postId },
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

  public static async getMutualLikers(sessionUserId: string, postId: string) {
    try {
      const result = await prismaClient.postLike.findMany({
        where: { postId },
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

  public static async getLikesCount(postId: string) {
    try {
      const result = await prismaClient.postLike.findMany({
        where: { postId },
      });
      return result.length;
    } catch (err) {
      return err;
    }
  }

  // ----------------------------------------------------------------------------------

  public static async createCommentOnPost(
    sessionUserId: string,
    content: string,
    postId: string
  ) {
    try {
      await PostEngagementService.checkOrCreatePostEngagement(postId);

      const comment = await prismaClient.comment.create({
        data: {
          content,
          postEngagement: { connect: { postId } },
          author: { connect: { id: sessionUserId } },
        },
        include: {
          postEngagement: {
            include: { post: true },
          },
        },
      });

      // create notification
      await NotificationService.createNotification(
        NotificationType.COMMENT_ON_POST,
        sessionUserId,
        comment.postEngagement.post.authorId,
        { postId, commentId: comment.id }
      );

      return true;
    } catch (err) {
      return err;
    }
  }

  public static async deleteComment(
    sessionUserId: string,
    postId: string,
    commentId: string
  ) {
    try {
      const comment = await prismaClient.comment.delete({
        where: { id: commentId, authorId: sessionUserId, postId },
        include: {
          postEngagement: { include: { post: true } },
          parentComment: true,
        },
      });

      await PostEngagementService.checkOrDeletePostEngagement(postId);

      // delete notification
      if (!comment.parentCommentId) {
        await NotificationService.deleteNotification(
          NotificationType.COMMENT_ON_POST,
          sessionUserId,
          comment.postEngagement.post.authorId,
          { postId, commentId: comment.id }
        );
      } else {
        await NotificationService.deleteNotification(
          NotificationType.REPLY_ON_COMMENT,
          sessionUserId,
          comment.parentComment?.authorId!,
          {
            postId,
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

  public static async getComment(postId: string, commentId: string) {
    return prismaClient.comment.findUnique({
      where: { id: commentId, postId },
      include: { repliedTo: { include: { author: true } } },
    });
  }

  public static async getComments(sessionUserId: string, postId: string) {
    try {
      const result = await prismaClient.comment.findMany({
        where: { postId, parentCommentId: null },
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

  public static async getCommentsCount(postId: string) {
    try {
      const result = await prismaClient.comment.findMany({
        where: { postId },
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
        { postId: commentLike.comment.postId, commentId }
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
        { postId: commentLike.comment.postId }
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
    postId: string,
    commentId: string,
    content: string
  ) {
    try {
      const comment = await PostEngagementService.getComment(postId, commentId);
      if (!comment) throw new Error("Parent comment not found");

      let repliedComment;
      if (!comment.parentCommentId) {
        repliedComment = await prismaClient.comment.create({
          data: {
            postEngagement: { connect: { postId } },
            content,
            author: { connect: { id: sessionUserId } },
            parentComment: { connect: { id: commentId } },
            repliedTo: { connect: { id: commentId } },
          },
        });
      } else {
        repliedComment = await prismaClient.comment.create({
          data: {
            postEngagement: { connect: { postId } },
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
        { postId, commentId, repliedCommentId: repliedComment.id }
      );

      return true;
    } catch (err) {
      return err;
    }
  }

  public static async getCommentsOfComment(commentId: string, postId: string) {
    try {
      const result = await prismaClient.comment.findMany({
        where: { parentCommentId: commentId, postId },
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
    postId: string
  ) {
    try {
      const result = await prismaClient.comment.findMany({
        where: { parentCommentId: commentId, postId },
      });
      return result.length;
    } catch (err) {
      return err;
    }
  }

  // ---------------------------------------------------------------------------------

  public static async createBookmark(sessionUserId: string, postId: string) {
    try {
      await PostEngagementService.checkOrCreatePostEngagement(postId);
      await prismaClient.bookmark.create({
        data: {
          user: { connect: { id: sessionUserId } },
          postEngagement: { connect: { postId } },
        },
      });
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async removeBookmark(sessionUserId: string, postId: string) {
    try {
      await prismaClient.bookmark.delete({
        where: { userId_postId: { userId: sessionUserId, postId } },
      });
      await PostEngagementService.checkOrDeletePostEngagement(postId);
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async getBookmarks(sessionUserId: string) {
    try {
      const result = await prismaClient.bookmark.findMany({
        where: { userId: sessionUserId },
        include: { postEngagement: { include: { post: true } } },
      });
      return result.map((bookmark) => bookmark.postEngagement.post);
    } catch (err) {
      return err;
    }
  }

  public static async isPostBookmarkedBySessionUser(
    sessionUserId: string,
    postId: string
  ) {
    try {
      const result = await prismaClient.bookmark.findUnique({
        where: { userId_postId: { userId: sessionUserId, postId } },
      });
      if (!result) return false;
      return true;
    } catch (err) {
      return err;
    }
  }
}
