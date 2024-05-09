import { TweetEngagement } from "@prisma/client";
import { GraphqlContext } from "..";
import { TweetEngagementService } from "../../services/tweet-engagement";

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
};

export const extraResolvers = {
  TweetEngagement: {
    likedBy: async (parent: TweetEngagement, {}: any, ctx: GraphqlContext) => {
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
  },
};

export const resolvers = { queries, mutations, extraResolvers };
