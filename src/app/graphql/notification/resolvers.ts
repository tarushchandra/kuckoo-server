import { Notification } from "@prisma/client";
import { GraphqlContext } from "..";
import { NotificationService } from "../../services/notification";
import TweetService from "../../services/tweet";
import { TweetEngagementService } from "../../services/tweet-engagement";

export interface NotificationMetaData {
  tweetId?: string;
  commentId?: string;
  repliedCommentId?: string;
}

// ----------------------------------------------------------------------------------

const queries = {
  getAllNotifications: async (_: any, {}: any, ctx: GraphqlContext) => {
    if (!ctx || !ctx.user?.id) return null;
    return await NotificationService.getAllNotifications(ctx.user.id);
  },
  getUnseenNotificationsCount: async (_: any, {}: any, ctx: GraphqlContext) => {
    if (!ctx || !ctx.user?.id) return null;
    return await NotificationService.getUnseenNotificationsCount(ctx.user.id);
  },
};

const mutations = {
  setNotificationsAsSeen: async (_: any, {}: any, ctx: GraphqlContext) => {
    if (!ctx || !ctx.user?.id) return null;
    return await NotificationService.setNotificationsAsSeen(ctx.user.id);
  },
};

const extraResolvers = {
  Notification: {
    metaData: (parent: Notification) => {
      const metaData = parent.metaData as NotificationMetaData;
      if (!metaData.tweetId && !metaData.commentId) return null;
      return metaData;
    },
  },
  MetaData: {
    tweet: async (parent: NotificationMetaData) => {
      if (!parent.tweetId) return null;
      return await TweetService.getTweet(parent.tweetId);
    },
    comment: async (parent: NotificationMetaData) => {
      if (!parent.commentId || !parent.tweetId) return null;
      return await TweetEngagementService.getComment(
        parent.tweetId,
        parent.commentId
      );
    },
    repliedComment: async (parent: NotificationMetaData) => {
      if (!parent.commentId || !parent.tweetId || !parent.repliedCommentId)
        return null;
      return await TweetEngagementService.getComment(
        parent.tweetId,
        parent.repliedCommentId
      );
    },
  },
};

export const resolvers = { queries, mutations, extraResolvers };
