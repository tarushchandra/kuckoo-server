import { Tweet } from "@prisma/client";
import { GraphqlContext } from "..";
import TweetService from "../../services/tweet";

export interface TweetInput {
  content: string;
  imageURL?: string;
}

const queries = {
  getAllTweets: async () => TweetService.getAllTweets(),
};

const mutations = {
  createTweet: async (
    _: any,
    { payload }: { payload: TweetInput },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user || !ctx.user.id) return null;
    return await TweetService.createTweet(payload, ctx.user.id);
  },
  deleteTweet: async (
    _: any,
    { tweetId }: { tweetId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user || !ctx.user.id) return null;
    return await TweetService.deleteTweet(ctx.user.id, tweetId);
  },
  updateTweet: async (
    _: any,
    { tweetId, content }: { tweetId: string; content: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user || !ctx.user.id) return null;
    return await TweetService.updateTweet(ctx.user.id, tweetId, content);
  },
};

const extraResolvers = {
  Tweet: {
    author: async (parent: Tweet) =>
      await TweetService.getAuthor(parent.authorId),
  },
};

export const resolvers = { queries, mutations, extraResolvers };
