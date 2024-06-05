import { Chat, Message } from "@prisma/client";
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
  public static async findOrCreateChat(
    sessionUserId: string,
    targetUserIds: string[],
    metaData?: ChatMetaData
  ) {
    const totalMemberIds = [sessionUserId, ...targetUserIds];

    // find chat
    const chat = await prismaClient.chat.findFirst({
      where: {
        AND: [
          { members: { some: { userId: sessionUserId } } },
          { members: { some: { userId: targetUserIds[0] } } },
        ],
      },
    });
    if (chat) return chat;

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
          })),
        },
        name: metaData.chatName,
        isGroupChat: metaData.isGroupChat,
      },
    });
  }

  public static async getChats(sessionUserId: string) {
    try {
      const result = await prismaClient.chat.findMany({
        where: { members: { some: { userId: sessionUserId } } },
        include: {
          members: {
            where: { userId: { not: sessionUserId } },
            include: { user: true },
          },
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
        where: { chatId },
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

  public static async getLatestMessage(chatId: string) {
    try {
      return await prismaClient.message.findFirst({
        where: { chatId },
        orderBy: { createdAt: "desc" },
        include: { sender: { select: { firstName: true, username: true } } },
      });
    } catch (err) {
      return err;
    }
  }
}
