import { Chat, ChatMemberRole, Message } from "@prisma/client";
import { prismaClient } from "../clients/prisma";

export interface CreateMessagePayload {
  targetUserIds: string[];
  content: string;
  chatId?: string;
}

interface ChatMetaData {
  chatName: string;
  isGroupChat: boolean;
}

interface GroupedMessages {
  date: string;
  messages: Message[];
}

export class ChatService {
  private static async findOrCreateChat(
    sessionUserId: string,
    targetUserIds: string[],
    metaData?: ChatMetaData
  ) {
    const totalMemberIds = [sessionUserId, ...targetUserIds];

    if (!metaData) {
      const chat = await prismaClient.chat.findFirst({
        where: {
          AND: totalMemberIds.map((memberId) => ({
            members: { some: { userId: memberId } },
          })),
        },
      });
      if (chat) return chat;
      // console.log("chat -", chat);
    }

    // create chat
    if (!metaData)
      return prismaClient.chat.create({
        data: {
          creator: { connect: { id: sessionUserId } },
          members: {
            create: totalMemberIds.map((memberId) => ({
              user: { connect: { id: memberId } },
            })),
          },
        },
      });

    return prismaClient.chat.create({
      data: {
        creator: { connect: { id: sessionUserId } },
        members: {
          create: totalMemberIds.map((memberId) => ({
            user: { connect: { id: memberId } },
            role:
              memberId === sessionUserId
                ? ChatMemberRole.ADMIN
                : ChatMemberRole.MEMBER,
          })),
        },
        name: metaData.chatName,
        isGroupChat: metaData.isGroupChat,
      },
    });
  }

  public static async createGroup(
    sessionUserId: string,
    name: string,
    targetUserIds: string[]
  ) {
    try {
      await ChatService.findOrCreateChat(sessionUserId, targetUserIds, {
        chatName: name,
        isGroupChat: true,
      });
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async addUsersToGroup(
    sessionUserId: string,
    chatId: string,
    targetUserIds: string[]
  ) {
    try {
      await prismaClient.chat.update({
        where: { id: chatId, creatorId: sessionUserId },
        data: {
          members: {
            create: targetUserIds.map((memberId) => ({
              user: { connect: { id: memberId } },
            })),
          },
        },
      });
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async getChats(sessionUserId: string) {
    try {
      const result = await prismaClient.chat.findMany({
        where: { members: { some: { userId: sessionUserId } } },
        include: {
          members: {
            where: { userId: { not: sessionUserId } },
            include: { user: true },
            take: 2,
            orderBy: { createdAt: "asc" },
          },
          creator: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      return result.map((chat) => ({
        ...chat,
        members: chat.members.map((x) => x.user),
      }));
    } catch (err) {
      return err;
    }
  }

  public static async getChatMembers(sessionUserId: string, chatId: string) {
    try {
      const result = await prismaClient.chatMembership.findMany({
        where: {
          chatId,
          chat: { members: { some: { userId: sessionUserId } } },
        },
        include: { user: true },
      });

      const sessionUserChatMembership = result.filter(
        (x) => x.userId === sessionUserId
      );
      const adminChatMemberships = result.filter((x) => {
        if (x.userId === sessionUserId) return;
        return x.role === ChatMemberRole.ADMIN;
      });
      const remainingChatMemberships = result.filter(
        (x) => x.userId !== sessionUserId && x.role !== ChatMemberRole.ADMIN
      );

      // console.log("sessionUserChatMembership -", sessionUserChatMembership);
      // console.log("adminChatMemberships -", adminChatMemberships);
      // console.log("remainingChatMemberships -", remainingChatMemberships);

      return [
        {
          user: sessionUserChatMembership[0].user,
          role: sessionUserChatMembership[0].role,
        },
        ...adminChatMemberships,
        ...remainingChatMemberships,
      ];
    } catch (err) {
      return err;
    }
  }

  public static async getMembersCount(sessionUserId: string, chatId: string) {
    try {
      return prismaClient.chatMembership.count({
        where: {
          chatId,
          chat: { members: { some: { userId: sessionUserId } } },
        },
      });
    } catch (err) {
      return err;
    }
  }

  // ---------------------------------------------------------------------------------

  public static async createMessage(
    sessionUserId: string,
    payload: CreateMessagePayload
  ) {
    // console.log("session user -", sessionUserId);
    // console.log("payload -", payload);

    const { content, targetUserIds, chatId } = payload;
    let chat: Chat | null = null;

    try {
      if (!chatId)
        chat = await ChatService.findOrCreateChat(sessionUserId, targetUserIds);

      await prismaClient.message.create({
        data: {
          content,
          sender: { connect: { id: sessionUserId } },
          chat: {
            connect: {
              id: chatId ? chatId : chat?.id,
            },
          },
        },
      });

      await prismaClient.chat.update({
        where: { id: chatId ? chatId : chat?.id },
        data: {
          updatedAt: new Date(Date.now()),
        },
      });

      return true;
    } catch (err) {
      return err;
    }
  }

  public static async getMessages(sessionUserId: string, chatId: string) {
    try {
      const result = await prismaClient.message.findMany({
        where: {
          chatId,
          chat: { members: { some: { userId: sessionUserId } } },
        },
        include: { sender: true },
        orderBy: { createdAt: "desc" },
      });

      const groupedMessages = result.reduce(
        (acc: GroupedMessages[], message) => {
          const createdAtDate = new Date(message.createdAt).toDateString();

          const groupedMessage = acc.find((x) => x.date === createdAtDate);
          if (!groupedMessage)
            acc.push({ date: createdAtDate, messages: [message] });
          else groupedMessage.messages.push(message);

          return acc;
        },
        []
      );

      return groupedMessages;
    } catch (err) {
      return err;
    }
  }

  public static async getLatestMessage(sessionUserId: string, chatId: string) {
    try {
      return await prismaClient.message.findFirst({
        where: {
          chatId,
          chat: { members: { some: { userId: sessionUserId } } },
        },
        orderBy: { createdAt: "desc" },
        include: { sender: { select: { firstName: true, username: true } } },
      });
    } catch (err) {
      return err;
    }
  }
}
