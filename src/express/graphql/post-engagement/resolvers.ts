import { GraphqlContext } from "..";
import { requireAuthenticationAndGetUser } from "../../../middlewares/auth";
import { Comment, PostEngagement } from "../../../generated/prisma";
import { PostEngagementService } from "../../../services/post-engagement";
import UserService from "../../../services/user";

export const queries = {
  getPostEngagement: async (_: any, { postId }: { postId: string }) =>
    await PostEngagementService.getPostEngagement(postId),
  getMutualLikers: async (
    _: any,
    { postId }: { postId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostEngagementService.getMutualLikers(user.id, postId);
  },
  getCommentsOfComment: async (
    _: any,
    { postId, commentId }: { postId: string; commentId: string }
  ) => PostEngagementService.getCommentsOfComment(commentId, postId),
  getComment: async (
    _: any,
    { postId, commentId }: { postId: string; commentId: string }
  ) => PostEngagementService.getComment(postId, commentId),
  getBookmarks: async (_: any, {}, ctx: GraphqlContext) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostEngagementService.getBookmarks(user.id);
  },
};

export const mutations = {
  likePost: async (
    _: any,
    { postId }: { postId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostEngagementService.likePost(user.id, postId);
  },
  dislikePost: async (
    _: any,
    { postId }: { postId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostEngagementService.dislikePost(user.id, postId);
  },
  createComment: async (
    _: any,
    { postId, content }: { postId: string; content: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostEngagementService.createCommentOnPost(
      user.id,
      content,
      postId
    );
  },
  deleteComment: async (
    _: any,
    { postId, commentId }: { postId: string; commentId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostEngagementService.deleteComment(
      user.id,
      postId,
      commentId
    );
  },
  updateComment: async (
    _: any,
    { commentId, content }: { commentId: string; content: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostEngagementService.updateComment(
      user.id,
      commentId,
      content
    );
  },
  likeComment: async (
    _: any,
    { commentId }: { commentId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostEngagementService.likeComment(user.id, commentId);
  },
  dislikeComment: async (
    _: any,
    { commentId }: { commentId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostEngagementService.dislikeComment(user.id, commentId);
  },
  createReply: async (
    _: any,
    {
      postId,
      commentId,
      content,
    }: { postId: string; commentId: string; content: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostEngagementService.addReplyToComment(
      user.id,
      postId,
      commentId,
      content
    );
  },
  createBookmark: async (
    _: any,
    { postId }: { postId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostEngagementService.createBookmark(user.id, postId);
  },
  removeBookmark: async (
    _: any,
    { postId }: { postId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostEngagementService.removeBookmark(user.id, postId);
  },
};

export const extraResolvers = {
  PostEngagement: {
    likes: async (parent: PostEngagement, {}: any, ctx: GraphqlContext) => {
      const user = requireAuthenticationAndGetUser(ctx);
      return await PostEngagementService.getLikes(user.id, parent.postId);
    },
    likesCount: async (parent: PostEngagement) =>
      await PostEngagementService.getLikesCount(parent.postId),
    isPostLikedBySessionUser: async (
      parent: PostEngagement,
      {}: any,
      ctx: GraphqlContext
    ) => {
      const user = requireAuthenticationAndGetUser(ctx);
      return await PostEngagementService.isLikeExist(user.id, parent.postId);
    },
    comments: async (parent: PostEngagement, {}: any, ctx: GraphqlContext) => {
      const user = requireAuthenticationAndGetUser(ctx);
      return await PostEngagementService.getComments(user.id, parent.postId);
    },
    commentsCount: async (parent: PostEngagement) =>
      await PostEngagementService.getCommentsCount(parent.postId),
    isPostBookmarkedBySessionUser: async (
      parent: PostEngagement,
      {},
      ctx: GraphqlContext
    ) => {
      const user = requireAuthenticationAndGetUser(ctx);
      return await PostEngagementService.isPostBookmarkedBySessionUser(
        user.id,
        parent.postId
      );
    },
  },

  Comment: {
    author: async (parent: Comment) =>
      await UserService.getUserById(parent.authorId),
    likesCount: async (parent: Comment) =>
      await PostEngagementService.getCommentLikesCount(parent.id),
    isCommentLikedBySessionUser: async (
      parent: Comment,
      {}: any,
      ctx: GraphqlContext
    ) => {
      const user = requireAuthenticationAndGetUser(ctx);
      return await PostEngagementService.isCommentLikedBySessionUser(
        user.id,
        parent.id
      );
    },
    commentsCount: async (parent: Comment) =>
      PostEngagementService.getCommentsCountOfComment(parent.id, parent.postId),
    parentComment: async (parent: Comment) =>
      PostEngagementService.getParentComment(parent.id),
    repliedTo: async (parent: Comment) =>
      await PostEngagementService.getComment(
        parent.postId,
        parent.repliedToCommentId!
      ),
  },
};

export const resolvers = { queries, mutations, extraResolvers };
