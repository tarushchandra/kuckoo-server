import { GraphqlContext } from "..";
import { Notification } from "../../../generated/prisma";
import { requireAuthenticationAndGetUser } from "../../middlewares/auth";
import { NotificationService } from "../../services/notification";
import PostService from "../../services/post";
import { PostEngagementService } from "../../services/post-engagement";

export interface NotificationMetaData {
  postId?: string;
  commentId?: string;
  repliedCommentId?: string;
}

// ----------------------------------------------------------------------------------

const queries = {
  getAllNotifications: async (_: any, {}: any, ctx: GraphqlContext) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await NotificationService.getAllNotifications(user.id);
  },
  getUnseenNotificationsCount: async (_: any, {}: any, ctx: GraphqlContext) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await NotificationService.getUnseenNotificationsCount(user.id);
  },
};

const mutations = {
  setNotificationsAsSeen: async (_: any, {}: any, ctx: GraphqlContext) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await NotificationService.setNotificationsAsSeen(user.id);
  },
};

const extraResolvers = {
  Notification: {
    metaData: (parent: Notification) => {
      const metaData = parent.metaData as NotificationMetaData;
      if (!metaData.postId && !metaData.commentId) return null;
      return metaData;
    },
  },
  MetaData: {
    post: async (parent: NotificationMetaData) => {
      if (!parent.postId) return null;
      return await PostService.getPost(parent.postId);
    },
    comment: async (parent: NotificationMetaData) => {
      if (!parent.commentId || !parent.postId) return null;
      return await PostEngagementService.getComment(
        parent.postId,
        parent.commentId
      );
    },
    repliedComment: async (parent: NotificationMetaData) => {
      if (!parent.commentId || !parent.postId || !parent.repliedCommentId)
        return null;
      return await PostEngagementService.getComment(
        parent.postId,
        parent.repliedCommentId
      );
    },
  },
};

export const resolvers = { queries, mutations, extraResolvers };
