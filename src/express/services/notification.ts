import { NotificationType } from "@prisma/client";
import { prismaClient } from "../clients/prisma";
import { NotificationMetaData } from "../graphql/notification/resolvers";

export class NotificationService {
  public static async createNotification<T extends NotificationType>(
    type: T,
    senderId: string,
    recipientId: string,
    metaData?: NotificationMetaData
  ) {
    if (senderId === recipientId) return;

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
  }

  public static async deleteNotification<T extends NotificationType>(
    type: T,
    senderId: string,
    recipientId: string,
    metaData?: NotificationMetaData
  ) {
    const notification = await NotificationService.isNotificationExist(
      type,
      senderId,
      recipientId,
      metaData
    );
    if (!notification) return;
    await prismaClient.notification.delete({
      where: { id: notification.id },
    });
  }

  public static async isNotificationExist<T extends NotificationType>(
    type: T,
    senderId: string,
    recipientId: string,
    metaData?: NotificationMetaData
  ) {
    // FOLLOW
    if (!metaData)
      return prismaClient.notification.findFirst({
        where: { type, senderId, recipientId },
      });

    // LIKE_ON_POST
    if (!metaData.commentId && !metaData.repliedCommentId)
      return prismaClient.notification.findFirst({
        where: {
          type,
          senderId,
          recipientId,
          metaData: { path: ["postId"], equals: metaData.postId },
        },
      });

    //  LIKE_ON_COMMENT, COMMENT_ON_POST
    if (!metaData.repliedCommentId)
      return prismaClient.notification.findFirst({
        where: {
          type,
          senderId,
          recipientId,
          AND: [
            { metaData: { path: ["postId"], equals: metaData.postId } },
            { metaData: { path: ["commentId"], equals: metaData.commentId } },
          ],
        },
      });

    // REPLY_ON_COMMENT
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
  }

  public static async getAllNotifications(sessionUserId: string) {
    try {
      const result = await prismaClient.notification.findMany({
        where: { recipientId: sessionUserId },
        include: { sender: true, recipient: true },
      });
      result.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

      const unseenNotifications = result.filter(
        (notification) => notification.isSeen === false
      );
      const seenNotifications = result.filter(
        (notification) => notification.isSeen === true
      );

      return { unseenNotifications, seenNotifications };
    } catch (err) {
      return err;
    }
  }

  public static async getUnseenNotificationsCount(sessionUserId: string) {
    try {
      const result = await prismaClient.notification.findMany({
        where: { recipientId: sessionUserId, isSeen: false },
      });
      return result.length;
    } catch (err) {
      return err;
    }
  }

  public static async setNotificationsAsSeen(sessionUserId: string) {
    try {
      await prismaClient.notification.updateMany({
        where: { recipientId: sessionUserId, isSeen: false },
        data: { isSeen: true },
      });
      return true;
    } catch (err) {
      return err;
    }
  }
}
