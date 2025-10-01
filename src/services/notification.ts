import { NotificationMetaData } from "../graphql/notification/resolvers";
import { prismaClient } from "../clients/prisma";
import { Notification, NotificationType } from "../../generated/prisma";
import {
  isAppError,
  NotFoundError,
  toAppError,
  ValidationError,
} from "../utils/error";

export class NotificationService {
  public static async createNotification<T extends NotificationType>(
    type: T,
    senderId: string,
    recipientId: string,
    metaData?: NotificationMetaData
  ): Promise<Notification | null> {
    if (!type)
      throw new ValidationError("Notification type is required", "type");
    if (!senderId)
      throw new ValidationError("Sender ID is required", "senderId");
    if (!recipientId)
      throw new ValidationError("Recipient ID is required", "recipientId");

    // Prevent sending notification to self
    if (senderId === recipientId) return null;

    // Validation for metaData based on type
    if (type === NotificationType.LIKE_ON_POST) {
      if (!metaData)
        throw new ValidationError("MetaData is required", "metaData");
      if (!metaData.postId)
        throw new ValidationError(
          "Post ID is required in metaData",
          "metaData.postId"
        );
    }
    if (
      type === NotificationType.COMMENT_ON_POST ||
      type === NotificationType.LIKE_ON_COMMENT
    ) {
      if (!metaData)
        throw new ValidationError("MetaData is required", "metaData");
      if (!metaData.postId)
        throw new ValidationError(
          "Post ID is required in metaData",
          "metaData.postId"
        );
      if (!metaData.commentId)
        throw new ValidationError(
          "Comment ID is required in metaData",
          "metaData.commentId"
        );
    }
    if (type === NotificationType.REPLY_ON_COMMENT) {
      if (!metaData)
        throw new ValidationError("MetaData is required", "metaData");
      if (!metaData.commentId)
        throw new ValidationError(
          "Comment ID is required in metaData",
          "metaData.commentId"
        );
      if (!metaData.repliedCommentId)
        throw new ValidationError(
          "Replied Comment ID is required in metaData",
          "metaData.repliedCommentId"
        );
    }
    if (type === NotificationType.FOLLOW) {
      if (!senderId)
        throw new ValidationError("Sender ID is required", "senderId");
      if (!recipientId)
        throw new ValidationError("Recipient ID is required", "recipientId");
    }

    try {
      return prismaClient.notification.create({
        data: {
          type,
          sender: { connect: { id: senderId } },
          recipient: { connect: { id: recipientId } },
          metaData: {
            postId: metaData?.postId,
            commentId: metaData?.commentId,
            repliedCommentId: metaData?.repliedCommentId,
          },
        },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async deleteNotification<T extends NotificationType>(
    type: T,
    senderId: string,
    recipientId: string,
    metaData?: NotificationMetaData
  ): Promise<void> {
    if (!type)
      throw new ValidationError("Notification type is required", "type");
    if (!senderId)
      throw new ValidationError("Sender ID is required", "senderId");
    if (!recipientId)
      throw new ValidationError("Recipient ID is required", "recipientId");

    try {
      const notification = await NotificationService.isNotificationExist(
        type,
        senderId,
        recipientId,
        metaData
      );
      if (!notification)
        throw new NotFoundError("Notification not found", "Notification");
      await prismaClient.notification.delete({
        where: { id: notification.id },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async isNotificationExist<T extends NotificationType>(
    type: T,
    senderId: string,
    recipientId: string,
    metaData?: NotificationMetaData
  ): Promise<Notification | null> {
    if (!type)
      throw new ValidationError("Notification type is required", "type");
    if (!senderId)
      throw new ValidationError("Sender ID is required", "senderId");
    if (!recipientId)
      throw new ValidationError("Recipient ID is required", "recipientId");

    try {
      // FOLLOW
      if (!metaData)
        return prismaClient.notification.findFirst({
          where: { type, senderId, recipientId },
        });

      // LIKE_ON_POST
      if (!metaData.commentId && !metaData.repliedCommentId) {
        if (!metaData.postId)
          throw new ValidationError(
            "Post ID is required in metaData",
            "metaData.postId"
          );
        return prismaClient.notification.findFirst({
          where: {
            type,
            senderId,
            recipientId,
            metaData: { path: ["postId"], equals: metaData.postId },
          },
        });
      }

      //  LIKE_ON_COMMENT, COMMENT_ON_POST
      if (!metaData.repliedCommentId) {
        if (!metaData.postId)
          throw new ValidationError(
            "Post ID is required in metaData",
            "metaData.postId"
          );
        if (!metaData.commentId)
          throw new ValidationError(
            "Comment ID is required in metaData",
            "metaData.commentId"
          );
        return prismaClient.notification.findFirst({
          where: {
            type,
            senderId,
            recipientId,
            AND: [
              { metaData: { path: ["postId"], equals: metaData.postId } },
              {
                metaData: { path: ["commentId"], equals: metaData.commentId },
              },
            ],
          },
        });
      }

      // REPLY_ON_COMMENT
      if (!metaData.postId)
        throw new ValidationError(
          "Post ID is required in metaData",
          "metaData.postId"
        );
      if (!metaData.commentId)
        throw new ValidationError(
          "Comment ID is required in metaData",
          "metaData.commentId"
        );
      if (!metaData.repliedCommentId)
        throw new ValidationError(
          "Replied Comment ID is required in metaData",
          "metaData.repliedCommentId"
        );
      return prismaClient.notification.findFirst({
        where: {
          type,
          senderId,
          recipientId,
          AND: [
            { metaData: { path: ["postId"], equals: metaData.postId } },
            { metaData: { path: ["commentId"], equals: metaData.commentId } },
            {
              metaData: {
                path: ["repliedCommentId"],
                equals: metaData.repliedCommentId,
              },
            },
          ],
        },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getAllNotifications(sessionUserId: string): Promise<{
    unseenNotifications: Notification[];
    seenNotifications: Notification[];
  }> {
    if (!sessionUserId)
      throw new ValidationError("Session User ID is required", "sessionUserId");

    try {
      const result = await prismaClient.notification.findMany({
        where: { recipientId: sessionUserId },
        include: { sender: true, recipient: true },
        orderBy: { createdAt: "desc" },
      });

      const unseenNotifications = result.filter(
        (notification) => notification.isSeen === false
      );
      const seenNotifications = result.filter(
        (notification) => notification.isSeen === true
      );

      return { unseenNotifications, seenNotifications };
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getUnseenNotificationsCount(
    sessionUserId: string
  ): Promise<number> {
    if (!sessionUserId)
      throw new ValidationError("Session User ID is required", "sessionUserId");

    try {
      return await prismaClient.notification.count({
        where: { recipientId: sessionUserId, isSeen: false },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async setNotificationsAsSeen(
    sessionUserId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session User ID is required", "sessionUserId");

    try {
      await prismaClient.notification.updateMany({
        where: { recipientId: sessionUserId, isSeen: false },
        data: { isSeen: true },
      });
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }
}
