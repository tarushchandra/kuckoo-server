import { Tweet } from "@prisma/client";
import { GraphqlContext } from "..";
import TweetService from "../../services/tweet";
import { TweetEngagementService } from "../../services/tweet-engagement";
import UserService from "../../services/user";
import { requireAuthenticationAndGetUser } from "../../../middlewares/auth";

export interface TweetInput {
  content?: string;
  imageURL?: string;
}
export interface ImageUploadInput {
  imageName: string;
  imageType: string;
}

const queries = {
  getTweet: async (_: any, { tweetId }: { tweetId: string }) =>
    await TweetService.getTweet(tweetId),
  getPaginatedTweets: async (
    _: any,
    {
      userId,
      limit,
      cursor,
    }: { userId: string; limit: number; cursor?: string }
  ) => {
    return await TweetService.getTweets(userId, limit, cursor);
  },
  getAllTweets: async () => TweetService.getAllTweets(),
  getSignedURLForUploadingImage: async (
    _: any,
    { payload }: { payload: ImageUploadInput },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetService.getSignedURLForUploadingTweet(user.id, payload);
  },
  getPaginatedTweetsFeed: async (
    _: any,
    { limit, cursor }: { limit: number; cursor?: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetService.getTweetsFeed(user.id, limit, cursor);
  },
};

const mutations = {
  createTweet: async (
    _: any,
    { payload }: { payload: TweetInput },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetService.createTweet(payload, user.id);
  },
  deleteTweet: async (
    _: any,
    { tweetId }: { tweetId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetService.deleteTweet(user.id, tweetId);
  },
  updateTweet: async (
    _: any,
    { tweetId, payload }: { tweetId: string; payload: TweetInput },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetService.updateTweet(user.id, tweetId, payload);
  },
};

const extraResolvers = {
  Tweet: {
    author: async (parent: Tweet) =>
      await UserService.getUserById(parent.authorId),
    tweetEngagement: async (parent: Tweet) =>
      await TweetEngagementService.getTweetEngagement(parent.id),
  },
};

export const resolvers = { queries, mutations, extraResolvers };
