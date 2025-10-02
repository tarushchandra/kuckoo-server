import UserService from "./user";
import { NotificationService } from "./notification";
import { prismaClient } from "../clients/prisma";
import {
  Bookmark,
  Comment,
  NotificationType,
  Post,
  PostEngagement,
  User,
} from "../../generated/prisma";
import {
  AuthorizationError,
  isAppError,
  NotFoundError,
  toAppError,
  ValidationError,
} from "../utils/error";

export class PostEngagementService {
  public static async getPostEngagement(
    postId: string
  ): Promise<PostEngagement | null> {
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      return await prismaClient.postEngagement.findUnique({
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
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  private static async createPostEngagement(
    postId: string
  ): Promise<PostEngagement> {
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      return prismaClient.postEngagement.create({
        data: {
          post: { connect: { id: postId } },
        },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  private static async deletePostEngagement(
    postId: string
  ): Promise<PostEngagement> {
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      return prismaClient.postEngagement.delete({
        where: { postId },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  private static async checkOrCreatePostEngagement(
    postId: string
  ): Promise<void> {
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      const foundPostEngagement = await PostEngagementService.getPostEngagement(
        postId
      );
      if (!foundPostEngagement)
        await PostEngagementService.createPostEngagement(postId);
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  private static async checkOrDeletePostEngagement(
    postId: string
  ): Promise<void> {
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      // check if post engagement exists
      const result = await prismaClient.postEngagement.findUnique({
        where: { postId },
        include: {
          _count: {
            select: { likes: true, comments: true, bookmarks: true },
          },
        },
      });

      // delete if no engagement
      if (
        result &&
        result._count.likes === 0 &&
        result._count.comments === 0 &&
        result._count.bookmarks === 0
      ) {
        await prismaClient.postEngagement.delete({ where: { postId } });
      }
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  // ----------------------------------------------------------------------------------

  public static async likePost(
    sessionUserId: string,
    postId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      // Check if post engagement exists
      await PostEngagementService.checkOrCreatePostEngagement(postId);

      // Create like
      const likedPost = await prismaClient.postLike.create({
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
        likedPost.postEngagement.post.authorId,
        { postId }
      );

      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async dislikePost(
    sessionUserId: string,
    postId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      // delete like
      const dislikedPost = await prismaClient.postLike.delete({
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
        dislikedPost.postEngagement.post.authorId,
        { postId }
      );
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async isLikeExist(
    userId: string,
    postId: string
  ): Promise<boolean> {
    if (!userId) throw new ValidationError("User ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      const result = await prismaClient.postLike.findUnique({
        where: { userId_postId: { postId, userId } },
      });
      if (!result) return false;
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getLikes(
    sessionUserId: string,
    postId: string
  ): Promise<User[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");

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
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getMutualLikers(
    sessionUserId: string,
    postId: string
  ): Promise<User[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");

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
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getLikesCount(postId: string): Promise<number> {
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      return await prismaClient.postLike.count({
        where: { postId },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  // ----------------------------------------------------------------------------------

  public static async createCommentOnPost(
    sessionUserId: string,
    content: string,
    postId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");
    if (!content || content.trim().length === 0)
      throw new ValidationError("Comment content cannot be empty", "content");

    try {
      // check if post engagement exists
      await PostEngagementService.checkOrCreatePostEngagement(postId);

      // create comment
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
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async deleteComment(
    sessionUserId: string,
    postId: string,
    commentId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");
    if (!commentId)
      throw new ValidationError("Comment ID is required", "commentId");

    try {
      // delete comment
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
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async updateComment(
    sessionUserId: string,
    commentId: string,
    content: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!commentId)
      throw new ValidationError("Comment ID is required", "commentId");
    if (!content || content.trim().length === 0)
      throw new ValidationError("Comment content cannot be empty", "content");

    try {
      // update comment
      await prismaClient.comment.update({
        where: { id: commentId, authorId: sessionUserId },
        data: {
          content,
          updatedAt: new Date(Date.now()),
        },
      });
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getComment(
    postId: string,
    commentId: string
  ): Promise<Comment | null> {
    if (!postId) throw new ValidationError("Post ID is required", "postId");
    if (!commentId)
      throw new ValidationError("Comment ID is required", "commentId");

    try {
      return await prismaClient.comment.findUnique({
        where: { id: commentId, postId },
        include: { repliedTo: { include: { author: true } } },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getComments(
    sessionUserId: string,
    postId: string
  ): Promise<Comment[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      const result = await prismaClient.comment.findMany({
        where: { postId, parentCommentId: null },
        orderBy: { createdAt: "desc" },
      });

      const commentsOfSessionUser = result.filter(
        (comment) => comment.authorId === sessionUserId
      );
      const remainingComments = result.filter(
        (comment) => comment.authorId !== sessionUserId
      );

      if (commentsOfSessionUser.length === 0) return remainingComments;
      return [...commentsOfSessionUser, ...remainingComments];
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getCommentsCount(postId: string): Promise<number> {
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      return await prismaClient.comment.count({
        where: { postId },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async likeComment(
    sessionUserId: string,
    commentId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!commentId) throw new ValidationError("Comment ID is required");

    try {
      // create like
      const likedComment = await prismaClient.commentLike.create({
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
        likedComment.comment.authorId,
        { postId: likedComment.comment.postId, commentId }
      );

      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async dislikeComment(
    sessionUserId: string,
    commentId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!commentId) throw new ValidationError("Comment ID is required");

    try {
      // delete like
      const dislikedcomment = await prismaClient.commentLike.delete({
        where: { userId_commentId: { userId: sessionUserId, commentId } },
        include: { comment: true },
      });

      // delete notification
      await NotificationService.deleteNotification(
        NotificationType.LIKE_ON_COMMENT,
        sessionUserId,
        dislikedcomment.comment.authorId,
        { postId: dislikedcomment.comment.postId }
      );

      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getCommentLikesCount(commentId: string) {
    if (!commentId) throw new ValidationError("Comment ID is required");

    try {
      return await prismaClient.commentLike.count({
        where: { commentId },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async isCommentLikedBySessionUser(
    sessionUserId: string,
    commentId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!commentId) throw new ValidationError("Comment ID is required");

    try {
      const result = await prismaClient.commentLike.findUnique({
        where: { userId_commentId: { userId: sessionUserId, commentId } },
      });
      if (!result) return false;
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  // ----------------------------------------------

  public static async addReplyToComment(
    sessionUserId: string,
    postId: string,
    commentId: string,
    content: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");
    if (!commentId)
      throw new ValidationError("Comment ID is required", "commentId");
    if (!content || content.trim().length === 0)
      throw new ValidationError("Reply content cannot be empty", "content");

    try {
      // Check if comment exists
      const comment = await PostEngagementService.getComment(postId, commentId);
      if (!comment)
        throw new NotFoundError("Parent comment not found", "comment");

      // create reply comment
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
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getCommentsOfComment(
    commentId: string,
    postId: string
  ): Promise<Comment[]> {
    if (!commentId) throw new ValidationError("Comment ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      return await prismaClient.comment.findMany({
        where: { parentCommentId: commentId, postId },
        orderBy: { createdAt: "asc" },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getParentComment(
    commentId: string
  ): Promise<Comment | null> {
    if (!commentId) throw new ValidationError("Comment ID is required");

    try {
      const comment = await prismaClient.comment.findUnique({
        where: { id: commentId },
        include: { parentComment: true },
      });
      return comment?.parentComment || null;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getCommentsCountOfComment(
    commentId: string,
    postId: string
  ) {
    if (!commentId) throw new ValidationError("Comment ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      return await prismaClient.comment.count({
        where: { parentCommentId: commentId, postId },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  // ---------------------------------------------------------------------------------

  public static async createBookmark(
    sessionUserId: string,
    postId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      // Check if post engagement exists
      await PostEngagementService.checkOrCreatePostEngagement(postId);

      // create bookmark
      await prismaClient.bookmark.create({
        data: {
          user: { connect: { id: sessionUserId } },
          postEngagement: { connect: { postId } },
        },
      });
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async removeBookmark(
    sessionUserId: string,
    postId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      // delete bookmark
      await prismaClient.bookmark.delete({
        where: { userId_postId: { userId: sessionUserId, postId } },
      });
      await PostEngagementService.checkOrDeletePostEngagement(postId);
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getBookmarks(sessionUserId: string): Promise<Post[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");

    try {
      const result = await prismaClient.bookmark.findMany({
        where: { userId: sessionUserId },
        include: { postEngagement: { include: { post: true } } },
      });
      return result.map((bookmark) => bookmark.postEngagement.post);
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async isPostBookmarkedBySessionUser(
    sessionUserId: string,
    postId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      const result = await prismaClient.bookmark.findUnique({
        where: { userId_postId: { userId: sessionUserId, postId } },
      });
      if (!result) return false;
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }
}
