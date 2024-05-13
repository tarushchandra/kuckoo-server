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
    return await TweetEngagementService.createComment(
      ctx.user.id,
      tweetId,
      content
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
    comments: async (parent: TweetEngagement) =>
      await TweetEngagementService.getComments(parent.tweetId),
    commentsCount: async (parent: TweetEngagement) =>
      await TweetEngagementService.getCommentsCount(parent.tweetId),
  },

  Comment: {
    author: async (parent: Comment) =>
      await UserService.getUserById(parent.authorId),
  },
};

export const resolvers = { queries, mutations, extraResolvers };
