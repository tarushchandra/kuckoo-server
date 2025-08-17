import { Comment, TweetEngagement } from "@prisma/client";
import { GraphqlContext } from "..";
import { TweetEngagementService } from "../../services/tweet-engagement";
import UserService from "../../services/user";
import { requireAuthenticationAndGetUser } from "../../../middlewares/auth";

export const queries = {
  getTweetEngagement: async (_: any, { tweetId }: { tweetId: string }) =>
    await TweetEngagementService.getTweetEngagement(tweetId),
  getMutualLikers: async (
    _: any,
    { tweetId }: { tweetId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetEngagementService.getMutualLikers(user.id, tweetId);
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
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetEngagementService.getBookmarks(user.id);
  },
};

export const mutations = {
  likeTweet: async (
    _: any,
    { tweetId }: { tweetId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetEngagementService.likeTweet(user.id, tweetId);
  },
  dislikeTweet: async (
    _: any,
    { tweetId }: { tweetId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetEngagementService.dislikeTweet(user.id, tweetId);
  },
  createComment: async (
    _: any,
    { tweetId, content }: { tweetId: string; content: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetEngagementService.createCommentOnTweet(
      user.id,
      content,
      tweetId
    );
  },
  deleteComment: async (
    _: any,
    { tweetId, commentId }: { tweetId: string; commentId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetEngagementService.deleteComment(
      user.id,
      tweetId,
      commentId
    );
  },
  updateComment: async (
    _: any,
    { commentId, content }: { commentId: string; content: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetEngagementService.updateComment(
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
    return await TweetEngagementService.likeComment(user.id, commentId);
  },
  dislikeComment: async (
    _: any,
    { commentId }: { commentId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetEngagementService.dislikeComment(user.id, commentId);
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
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetEngagementService.addReplyToComment(
      user.id,
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
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetEngagementService.createBookmark(user.id, tweetId);
  },
  removeBookmark: async (
    _: any,
    { tweetId }: { tweetId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await TweetEngagementService.removeBookmark(user.id, tweetId);
  },
};

export const extraResolvers = {
  TweetEngagement: {
    likes: async (parent: TweetEngagement, {}: any, ctx: GraphqlContext) => {
      const user = requireAuthenticationAndGetUser(ctx);
      return await TweetEngagementService.getLikes(user.id, parent.tweetId);
    },
    likesCount: async (parent: TweetEngagement) =>
      await TweetEngagementService.getLikesCount(parent.tweetId),
    isTweetLikedBySessionUser: async (
      parent: TweetEngagement,
      {}: any,
      ctx: GraphqlContext
    ) => {
      const user = requireAuthenticationAndGetUser(ctx);
      return await TweetEngagementService.isLikeExist(user.id, parent.tweetId);
    },
    comments: async (parent: TweetEngagement, {}: any, ctx: GraphqlContext) => {
      const user = requireAuthenticationAndGetUser(ctx);
      return await TweetEngagementService.getComments(user.id, parent.tweetId);
    },
    commentsCount: async (parent: TweetEngagement) =>
      await TweetEngagementService.getCommentsCount(parent.tweetId),
    isTweetBookmarkedBySessionUser: async (
      parent: TweetEngagement,
      {},
      ctx: GraphqlContext
    ) => {
      const user = requireAuthenticationAndGetUser(ctx);
      return await TweetEngagementService.isTweetBookmarkedBySessionUser(
        user.id,
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
      const user = requireAuthenticationAndGetUser(ctx);
      return await TweetEngagementService.isCommentLikedBySessionUser(
        user.id,
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
