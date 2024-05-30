import { Comment, TweetEngagement } from "@prisma/client";
import { GraphqlContext } from "..";
import { TweetEngagementService } from "../../services/tweet-engagement";
import UserService from "../../services/user";

export const queries = {
  getTweetEngagement: async (_: any, { tweetId }: { tweetId: string }) =>
    await TweetEngagementService.getTweetEngagement(tweetId),
  getMutualLikers: async (
    _: any,
    { tweetId }: { tweetId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await TweetEngagementService.getMutualLikers(ctx.user.id, tweetId);
  },
  getCommentsOfComment: async (
    _: any,
    { tweetId, commentId }: { tweetId: string; commentId: string }
  ) => TweetEngagementService.getCommentsOfComment(commentId, tweetId),
  getComment: async (
    _: any,
    { tweetId, commentId }: { tweetId: string; commentId: string }
  ) => TweetEngagementService.getComment(tweetId, commentId),
  getBookmarks: async (_: any, {}, ctx: GraphqlContext) => {
    if (!ctx.user || !ctx.user.id) return null;
    return await TweetEngagementService.getBookmarks(ctx.user.id);
  },
};

export const mutations = {
  likeTweet: async (
    _: any,
    { tweetId }: { tweetId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await TweetEngagementService.likeTweet(ctx.user.id, tweetId);
  },
  dislikeTweet: async (
    _: any,
    { tweetId }: { tweetId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await TweetEngagementService.dislikeTweet(ctx.user.id, tweetId);
  },
  createComment: async (
    _: any,
    { tweetId, content }: { tweetId: string; content: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await TweetEngagementService.createCommentOnTweet(
      ctx.user.id,
      content,
      tweetId
    );
  },
  deleteComment: async (
    _: any,
    { tweetId, commentId }: { tweetId: string; commentId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await TweetEngagementService.deleteComment(
      ctx.user.id,
      tweetId,
      commentId
    );
  },
  updateComment: async (
    _: any,
    { commentId, content }: { commentId: string; content: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await TweetEngagementService.updateComment(
      ctx.user.id,
      commentId,
      content
    );
  },
  likeComment: async (
    _: any,
    { commentId }: { commentId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await TweetEngagementService.likeComment(ctx.user.id, commentId);
  },
  dislikeComment: async (
    _: any,
    { commentId }: { commentId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await TweetEngagementService.dislikeComment(ctx.user.id, commentId);
  },
  createReply: async (
    _: any,
    {
      tweetId,
      commentId,
      content,
    }: { tweetId: string; commentId: string; content: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await TweetEngagementService.addReplyToComment(
      ctx.user.id,
      tweetId,
      commentId,
      content
    );
  },
  createBookmark: async (
    _: any,
    { tweetId }: { tweetId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await TweetEngagementService.createBookmark(ctx.user.id, tweetId);
  },
  removeBookmark: async (
    _: any,
    { tweetId }: { tweetId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await TweetEngagementService.removeBookmark(ctx.user.id, tweetId);
  },
};

export const extraResolvers = {
  TweetEngagement: {
    likes: async (parent: TweetEngagement, {}: any, ctx: GraphqlContext) => {
      if (!ctx || !ctx.user?.id) return null;
      return await TweetEngagementService.getLikes(ctx.user.id, parent.tweetId);
    },
    likesCount: async (parent: TweetEngagement) =>
      await TweetEngagementService.getLikesCount(parent.tweetId),
    isTweetLikedBySessionUser: async (
      parent: TweetEngagement,
      {}: any,
      ctx: GraphqlContext
    ) => {
      if (!ctx || !ctx.user?.id) return null;
      return await TweetEngagementService.isLikeExist(
        ctx.user.id,
        parent.tweetId
      );
    },
    comments: async (parent: TweetEngagement, {}: any, ctx: GraphqlContext) => {
      if (!ctx || !ctx.user?.id) return null;
      return await TweetEngagementService.getComments(
        ctx.user.id,
        parent.tweetId
      );
    },
    commentsCount: async (parent: TweetEngagement) =>
      await TweetEngagementService.getCommentsCount(parent.tweetId),
    isTweetBookmarkedBySessionUser: async (
      parent: TweetEngagement,
      {},
      ctx: GraphqlContext
    ) => {
      if (!ctx || !ctx.user?.id) return null;
      return await TweetEngagementService.isTweetBookmarkedBySessionUser(
        ctx.user.id,
        parent.tweetId
      );
    },
  },

  Comment: {
    author: async (parent: Comment) =>
      await UserService.getUserById(parent.authorId),
    likesCount: async (parent: Comment) =>
      await TweetEngagementService.getCommentLikesCount(parent.id),
    isCommentLikedBySessionUser: async (
      parent: Comment,
      {}: any,
      ctx: GraphqlContext
    ) => {
      if (!ctx || !ctx.user?.id) return null;
      return await TweetEngagementService.isCommentLikedBySessionUser(
        ctx.user.id,
        parent.id
      );
    },
    commentsCount: async (parent: Comment) =>
      TweetEngagementService.getCommentsCountOfComment(
        parent.id,
        parent.tweetId
      ),
    parentComment: async (parent: Comment) =>
      TweetEngagementService.getParentComment(parent.id),
    repliedTo: async (parent: Comment) =>
      await TweetEngagementService.getComment(
        parent.tweetId,
        parent.repliedToCommentId!
      ),
  },
};

export const resolvers = { queries, mutations, extraResolvers };
