import { Chat, ChatActivity, ChatMemberRole, Message } from "@prisma/client";
import { prismaClient } from "../clients/prisma";
import UserService from "./user";

export interface CreateMessagePayload {
  targetUserIds: string[] | null;
  content: string;
  chatId?: string;
}

interface ChatMetaData {
  chatName: string;
  isGroupChat: boolean;
}

interface ChatHistory {
  date: string;
  messages: Message[];
  activities: ChatActivity[];
}

export class ChatService {
  private static async findOrCreateChat(
    sessionUserId: string,
    targetUserIds: string[],
    metaData?: ChatMetaData
  ) {
    const totalMemberIds = [sessionUserId, ...targetUserIds];

    console.log("totalMembersId -", totalMemberIds);
    console.log("metaData -", metaData);

    if (!metaData || !metaData.isGroupChat) {
      const chat = await prismaClient.chat.findFirst({
        where: {
          isGroupChat: false,
          AND: totalMemberIds.map((memberId) => ({
            members: { some: { userId: memberId } },
          })),
        },
      });
      // console.log("chat -", chat);
      if (chat) return chat;

      // create chat
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
    }

    const chat = await prismaClient.chat.findFirst({
      where: {
        name: metaData.chatName,
      },
    });
    // console.log("chat -", chat);
    if (chat) throw new Error("Group already exists");

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

  public static async getChat(sessionUserId: string, targetUserId: string) {
    try {
      const chat = await prismaClient.chat.findFirst({
        where: {
          isGroupChat: false,
          AND: [
            { members: { some: { userId: sessionUserId } } },
            { members: { some: { userId: targetUserId } } },
          ],
        },
        include: {
          members: {
            where: { userId: { not: sessionUserId } },
            include: { user: true },
          },
          creator: true,
        },
      });
      // console.log("chat -", chat);
      // console.log("user -", chat?.members[0].user);
      if (!chat) return null;
      return { ...chat, members: chat?.members.map((x) => x.user) };
    } catch (err) {
      return err;
    }
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

  public static async renameGroup(
    sessionUserId: string,
    chatId: string,
    name: string
  ) {
    try {
      await prismaClient.chat.update({
        where: {
          id: chatId,
          isGroupChat: true,
          members: {
            some: { AND: [{ userId: sessionUserId }, { role: "ADMIN" }] },
          },
        },
        data: { name },
      });
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async getAvailableMembers(
    sessionUserId: string,
    chatId: string,
    searchText: string
  ) {
    try {
      const result = await prismaClient.chatMembership.findMany({
        where: { chatId, NOT: { userId: sessionUserId } },
      });
      const targetMemberIds = result.map((x) => x.userId);

      return UserService.getUsersWithout(
        sessionUserId,
        targetMemberIds,
        searchText
      );
    } catch (err) {
      return err;
    }
  }

  public static async addMembersToGroup(
    sessionUserId: string,
    chatId: string,
    targetUserIds: string[]
  ) {
    try {
      // await prismaClient.chat.update({
      //   where: {
      //     id: chatId,
      //     members: {
      //       some: { AND: [{ userId: sessionUserId }, { role: "ADMIN" }] },
      //     },
      //   },
      //   data: {
      //     members: {
      //       create: targetUserIds.map((memberId) => ({
      //         user: { connect: { id: memberId } },
      //       })),
      //     },
      //   },
      // });

      await prismaClient.chat.update({
        where: {
          id: chatId,
          members: {
            some: { AND: [{ userId: sessionUserId }, { role: "ADMIN" }] },
          },
        },
        data: {
          members: {
            create: targetUserIds.map((memberId) => ({
              user: { connect: { id: memberId } },
            })),
          },
          activites: {
            create: targetUserIds.map((memberId) => ({
              type: "MEMBER_ADDED",
              user: { connect: { id: sessionUserId } },
              targetUser: { connect: { id: memberId } },
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
    console.log("session user -", sessionUserId);
    console.log("payload -", payload);

    const { content, targetUserIds, chatId } = payload;
    let chat: Chat | null = null;

    try {
      if (!chatId && targetUserIds)
        chat = await ChatService.findOrCreateChat(sessionUserId, targetUserIds);

      await prismaClient.chat.update({
        where: {
          id: chatId ? chatId : chat?.id,
          members: { some: { userId: sessionUserId } },
        },
        data: {
          messages: {
            create: [{ content, sender: { connect: { id: sessionUserId } } }],
          },
          updatedAt: new Date(Date.now()),
        },
      });

      return chat;
    } catch (err) {
      return err;
    }
  }

  public static async getChatHistory(sessionUserId: string, chatId: string) {
    try {
      const result = await prismaClient.chat.findUnique({
        where: { id: chatId, members: { some: { userId: sessionUserId } } },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            include: { sender: true },
          },
          activites: {
            orderBy: { createdAt: "desc" },
            include: { user: true, targetUser: true },
          },
        },
      });

      const items = [...result!.messages, ...result!.activites];
      items.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      // console.log("items -", items);

      const chatHistory = items.reduce((acc: ChatHistory[], curr: any) => {
        const createdAtDate = new Date(curr.createdAt).toDateString();

        const item = acc.find((x: any) => x.date === createdAtDate);
        if (!item) {
          if (curr.type)
            acc.push({ date: createdAtDate, messages: [], activities: [curr] });
          else
            acc.push({ date: createdAtDate, messages: [curr], activities: [] });
        } else {
          if (curr.type) item.activities.push(curr);
          else item.messages.push(curr);
        }

        return acc;
      }, []);

      console.log("chatHistory -", chatHistory);
      console.log("activity -", chatHistory[0].activities);

      return chatHistory;
    } catch (err) {
      return err;
    }
  }

  // public static async getChatHistory(sessionUserId: string, chatId: string) {
  //   try {
  //     const result = await prismaClient.message.findMany({
  //       where: {
  //         chatId,
  //         chat: { members: { some: { userId: sessionUserId } } },
  //       },
  //       include: { sender: true },
  //       orderBy: { createdAt: "desc" },
  //     });

  //     const groupedMessages = result.reduce(
  //       (acc: GroupedMessages[], message) => {
  //         const createdAtDate = new Date(message.createdAt).toDateString();

  //         const groupedMessage = acc.find((x) => x.date === createdAtDate);
  //         if (!groupedMessage)
  //           acc.push({ date: createdAtDate, messages: [message] });
  //         else groupedMessage.messages.push(message);

  //         return acc;
  //       },
  //       []
  //     );

  //     return groupedMessages;
  //   } catch (err) {
  //     return err;
  //   }
  // }

  public static async getLatestMessage(sessionUserId: string, chatId: string) {
    try {
      return await prismaClient.message.findFirst({
        where: {
          chatId,
          chat: { members: { some: { userId: sessionUserId } } },
        },
        orderBy: { createdAt: "desc" },
        include: {
          sender: {
            select: { firstName: true, username: true, profileImageURL: true },
          },
        },
      });
    } catch (err) {
      return err;
    }
  }
}
