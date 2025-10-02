import UserService from "./user";
import { prismaClient } from "../clients/prisma";
import {
  Chat,
  ChatActivity,
  ChatMemberRole,
  Message,
  User,
} from "../../generated/prisma";
import {
  ValidationError,
  NotFoundError,
  isAppError,
  toAppError,
  AuthorizationError,
} from "../utils/error";

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
  messages: {
    unseenMessages: Message[];
    seenMessages: Message[];
    sessionUserMessages: Message[];
  };
  activities: ChatActivity[];
}

// ---------------------------------------------------------------------------------

interface ChatWithMembers extends Chat {
  members: User[];
}

interface ChatMember {
  user: User;
  role: ChatMemberRole;
}

// ---------------------------------------------------------------------------------

export class ChatService {
  public static async findOrCreateChat(
    sessionUserId: string,
    targetUserIds: string[],
    metaData?: ChatMetaData
  ): Promise<Chat> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!targetUserIds || targetUserIds.length === 0)
      throw new ValidationError("At least one target user ID is required");

    const totalMemberIds = [sessionUserId, ...targetUserIds];

    try {
      // for one-on-one chat
      if (!metaData || !metaData.isGroupChat) {
        // check if chat already exists
        const chat = await prismaClient.chat.findFirst({
          where: {
            isGroupChat: false,
            AND: totalMemberIds.map((memberId) => ({
              members: { some: { userId: memberId } },
            })),
          },
        });
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

      // for group chat
      // check group chat name
      if (!metaData?.chatName || metaData.chatName.trim().length === 0)
        throw new ValidationError("Group chat name is required", "chatName");
      if (metaData.chatName.length > 100)
        throw new ValidationError(
          "Group chat name must not exceed 100 characters",
          "chatName"
        );

      // check if group chat with same name already exists
      const chat = await prismaClient.chat.findFirst({
        where: {
          name: metaData.chatName,
        },
      });
      if (chat) throw new ValidationError("Group already exists", "chatName");

      // create group chat
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
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getChat(
    sessionUserId: string,
    targetUserId: string
  ): Promise<ChatWithMembers | null> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!targetUserId) throw new ValidationError("Target user ID is required");

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
      if (!chat) return null;
      return { ...chat, members: chat?.members.map((x) => x.user) };
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async createGroup(
    sessionUserId: string,
    name: string,
    targetUserIds: string[]
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!name || name.trim().length === 0)
      throw new ValidationError("Group chat name is required", "name");
    if (name.length > 100)
      throw new ValidationError(
        "Group chat name must not exceed 100 characters",
        "name"
      );
    if (!targetUserIds || targetUserIds.length === 0)
      throw new ValidationError("At least one target user ID is required");

    try {
      await ChatService.findOrCreateChat(sessionUserId, targetUserIds, {
        chatName: name,
        isGroupChat: true,
      });
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async renameGroup(
    sessionUserId: string,
    chatId: string,
    name: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!chatId) throw new ValidationError("Chat ID is required", "chatId");
    if (!name || name.trim().length === 0)
      throw new ValidationError("Group chat name is required", "name");
    if (name.length > 100)
      throw new ValidationError(
        "Group chat name must not exceed 100 characters",
        "name"
      );

    try {
      // Check if chat exists and user is admin
      const chat = await prismaClient.chat.findFirst({
        where: {
          id: chatId,
          isGroupChat: true,
          members: {
            some: { AND: [{ userId: sessionUserId }, { role: "ADMIN" }] },
          },
        },
      });
      if (!chat)
        throw new NotFoundError(
          "Group chat not found or you are not an admin",
          "chat"
        );

      // rename group chat
      await prismaClient.chat.update({
        where: {
          id: chatId,
          isGroupChat: true,
          members: {
            some: { AND: [{ userId: sessionUserId }, { role: "ADMIN" }] },
          },
        },
        data: {
          name,
          activites: {
            create: {
              type: "CHAT_RENAMED",
              metaData: {
                chatName: name,
              },
              user: { connect: { id: sessionUserId } },
              targetUser: { connect: { id: sessionUserId } },
            },
          },
        },
      });
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getAvailableMembers(
    sessionUserId: string,
    chatId: string,
    searchText: string
  ): Promise<User[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!chatId) throw new ValidationError("Chat ID is required", "chatId");
    if (!searchText || searchText.trim().length === 0)
      throw new ValidationError("Search text is required", "searchText");
    if (searchText.length > 100)
      throw new ValidationError(
        "Search text must not exceed 100 characters",
        "searchText"
      );

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
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async addMembersToGroup(
    sessionUserId: string,
    chatId: string,
    targetUserIds: string[]
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!chatId) throw new ValidationError("Chat ID is required", "chatId");
    if (!targetUserIds || targetUserIds.length === 0)
      throw new ValidationError("At least one target user ID is required");

    try {
      // Add members to group
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
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async removeMemberFromGroup(
    sessionUserId: string,
    chatId: string,
    targetUserId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!chatId) throw new ValidationError("Chat ID is required", "chatId");
    if (!targetUserId)
      throw new ValidationError("Target user ID is required", "targetUserId");

    try {
      // Remove member from group
      await prismaClient.chat.update({
        where: {
          id: chatId,
          members: {
            some: { AND: [{ userId: sessionUserId }, { role: "ADMIN" }] },
          },
        },
        data: {
          members: {
            delete: { chatId_userId: { chatId, userId: targetUserId } },
          },
          activites: {
            create: {
              type: "MEMBER_REMOVED",
              user: { connect: { id: sessionUserId } },
              targetUser: { connect: { id: targetUserId } },
            },
          },
        },
      });
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async makeGroupAdmin(
    sessionUserId: string,
    chatId: string,
    targetUserId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!chatId) throw new ValidationError("Chat ID is required", "chatId");
    if (!targetUserId)
      throw new ValidationError("Target user ID is required", "targetUserId");

    try {
      // Add members to group
      await prismaClient.chat.update({
        where: {
          id: chatId,
          members: {
            some: { AND: [{ userId: sessionUserId }, { role: "ADMIN" }] },
          },
        },
        data: {
          members: {
            update: {
              where: { chatId_userId: { chatId, userId: targetUserId } },
              data: { role: "ADMIN" },
            },
          },
          activites: {
            create: {
              type: "ADMIN_ADDED",
              user: { connect: { id: sessionUserId } },
              targetUser: { connect: { id: targetUserId } },
            },
          },
        },
      });
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async removeGroupAdmin(
    sessionUserId: string,
    chatId: string,
    targetUserId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!chatId) throw new ValidationError("Chat ID is required", "chatId");
    if (!targetUserId)
      throw new ValidationError("Target user ID is required", "targetUserId");

    try {
      // Add members to group
      await prismaClient.chat.update({
        where: {
          id: chatId,
          members: {
            some: { AND: [{ userId: sessionUserId }, { role: "ADMIN" }] },
          },
        },
        data: {
          members: {
            update: {
              where: { chatId_userId: { chatId, userId: targetUserId } },
              data: { role: "MEMBER" },
            },
          },
          activites: {
            create: {
              type: "ADMIN_REMOVED",
              user: { connect: { id: sessionUserId } },
              targetUser: { connect: { id: targetUserId } },
            },
          },
        },
      });
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async leaveGroup(
    sessionUserId: string,
    chatId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!chatId) throw new ValidationError("Chat ID is required", "chatId");

    try {
      // Leave group
      await prismaClient.chat.update({
        where: { id: chatId, members: { some: { userId: sessionUserId } } },
        data: {
          members: {
            delete: { chatId_userId: { chatId, userId: sessionUserId } },
          },
          activites: {
            create: {
              type: "MEMBER_LEFT",
              user: { connect: { id: sessionUserId } },
              targetUser: { connect: { id: sessionUserId } },
            },
          },
        },
      });
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getChats(
    sessionUserId: string
  ): Promise<ChatWithMembers[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");

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
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getChatMembers(
    sessionUserId: string,
    chatId: string
  ): Promise<ChatMember[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!chatId) throw new ValidationError("Chat ID is required", "chatId");

    try {
      // Get chat members
      const result = await prismaClient.chatMembership.findMany({
        where: {
          chatId,
          chat: { members: { some: { userId: sessionUserId } } },
        },
        include: { user: true },
      });

      // Check if user is a member
      if (result.length === 0)
        throw new ValidationError("You are not a member of this chat");

      // Sort members
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

      // return with session user first, then admins, then members
      return [
        {
          user: sessionUserChatMembership[0].user,
          role: sessionUserChatMembership[0].role,
        },
        ...adminChatMemberships,
        ...remainingChatMemberships,
      ];
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getMembersCount(
    sessionUserId: string,
    chatId: string
  ): Promise<number> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!chatId) throw new ValidationError("Chat ID is required", "chatId");

    try {
      return prismaClient.chatMembership.count({
        where: {
          chatId,
          chat: { members: { some: { userId: sessionUserId } } },
        },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getChatHistory(
    sessionUserId: string,
    chatId: string
  ): Promise<ChatHistory[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!chatId) throw new ValidationError("Chat ID is required", "chatId");

    try {
      // Get chat history
      const result = await prismaClient.chat.findUnique({
        where: { id: chatId, members: { some: { userId: sessionUserId } } },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            include: {
              sender: true,
              seenBy: { select: { id: true } },
            },
          },
          activites: {
            orderBy: { createdAt: "desc" },
            include: { user: true, targetUser: true },
          },
        },
      });

      // If the chat is not found
      if (!result) throw new NotFoundError("Chat not found", "chat");

      // Sort chat history by date
      const items = [...result.messages, ...result.activites];
      items.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

      // Group chat history by date
      const chatHistory = items.reduce((acc: ChatHistory[], curr: any) => {
        const createdAtDate = new Date(curr.createdAt).toDateString();

        const item = acc.find((x: any) => x.date === createdAtDate);
        const isSeen = curr?.seenBy?.find(
          (user: any) => user.id === sessionUserId
        );

        if (!item) {
          if (curr.type) {
            acc.push({
              date: createdAtDate,
              messages: {
                unseenMessages: [],
                seenMessages: [],
                sessionUserMessages: [],
              },
              activities: [curr],
            });
            return acc;
          }

          if (curr.sender.id === sessionUserId)
            acc.push({
              date: createdAtDate,
              messages: {
                seenMessages: [],
                unseenMessages: [],
                sessionUserMessages: [{ ...curr, seenBy: curr.seenBy }],
              },
              activities: [],
            });
          else if (isSeen) {
            acc.push({
              date: createdAtDate,
              messages: {
                seenMessages: [curr],
                unseenMessages: [],
                sessionUserMessages: [],
              },
              activities: [],
            });
          } else
            acc.push({
              date: createdAtDate,
              messages: {
                seenMessages: [],
                unseenMessages: [curr],
                sessionUserMessages: [],
              },
              activities: [],
            });
          return acc;
        }

        if (curr.type) {
          item.activities.push(curr);
          return acc;
        }

        if (curr.sender.id === sessionUserId)
          item.messages.sessionUserMessages.push({
            ...curr,
            seenBy: curr.seenBy,
          });
        else if (isSeen) item.messages.seenMessages.push(curr);
        else item.messages.unseenMessages.push(curr);

        return acc;
      }, []);

      return chatHistory;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  // ---------------------------------------------------------------------------------

  public static async createMessages(
    sessionUserId: string,
    chatId: string,
    messages: any[]
  ): Promise<{ id: string }[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!chatId) throw new ValidationError("Chat ID is required", "chatId");
    if (!messages || messages.length === 0)
      throw new ValidationError("At least one message is required");

    // Validate each message
    messages.forEach((message, index) => {
      if (!message.content || message.content.trim().length === 0)
        throw new ValidationError(
          `Message content is required at index ${index}`,
          `messages[${index}].content`
        );
      if (message.content.length > 5000)
        throw new ValidationError(
          `Message content must not exceed 5000 characters at index ${index}`,
          `messages[${index}].content`
        );
    });

    try {
      // create messages
      const updatedChat = await prismaClient.chat.update({
        where: {
          id: chatId,
          members: { some: { userId: sessionUserId } },
        },
        data: {
          messages: {
            create: messages.map((message) => ({
              content: message.content,
              sender: { connect: { id: sessionUserId } },
              createdAt: new Date(Number(message.createdAt)),
            })),
          },
          updatedAt: new Date(Date.now()),
        },
        select: {
          messages: {
            select: { id: true },
            orderBy: { createdAt: "desc" },
            take: messages.length,
          },
        },
      });

      return updatedChat.messages;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getLatestChatContent(
    chatId: string
  ): Promise<Message | ChatActivity | null> {
    if (!chatId) throw new ValidationError("Chat ID is required", "chatId");

    try {
      // Get latest message
      const latestMessage = await prismaClient.message.findFirst({
        where: { chatId },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      });

      // Get latest activity
      const latestChatActivity = await prismaClient.chatActivity.findFirst({
        where: { chatId },
        orderBy: {
          createdAt: "desc",
        },
        include: { user: true, targetUser: true },
        take: 1,
      });

      if (!latestChatActivity) return latestMessage;

      const result =
        latestMessage?.createdAt! > latestChatActivity?.createdAt!
          ? latestMessage
          : latestChatActivity;

      return result;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getLatestMessage(
    sessionUserId: string,
    chatId: string
  ): Promise<Message | null> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!chatId) throw new ValidationError("Chat ID is required", "chatId");

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
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async setMessagesAsSeen(
    sessionUserId: string,
    chatId: string,
    messages: any
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!chatId) throw new ValidationError("Chat ID is required", "chatId");
    if (!messages || messages.length === 0)
      throw new ValidationError("Messages are required", "messages");

    try {
      // Set messages as seen
      await prismaClient.chat.update({
        where: { id: chatId, members: { some: { userId: sessionUserId } } },
        data: {
          messages: {
            update: messages.map((message: any) => ({
              where: {
                id: message.id,
                AND: [
                  { seenBy: { none: { id: sessionUserId } } },
                  { senderId: { not: sessionUserId } },
                ],
              },
              data: { seenBy: { connect: { id: sessionUserId } } },
            })),
          },
        },
      });
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getUnseenChatsCount(sessionUserId: string) {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");

    try {
      return await prismaClient.chat.count({
        where: {
          members: { some: { userId: sessionUserId } },
          messages: {
            some: {
              AND: [
                { seenBy: { none: { id: sessionUserId } } },
                { senderId: { not: sessionUserId } },
              ],
            },
          },
        },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getUnseenMessagesCount(
    sessionUserId: string,
    chatId: string
  ): Promise<number> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!chatId) throw new ValidationError("Chat ID is required", "chatId");

    try {
      return await prismaClient.message.count({
        where: {
          chatId,
          AND: [
            { seenBy: { none: { id: sessionUserId } } },
            { senderId: { not: sessionUserId } },
          ],
        },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getPeopleWithMessageSeen(
    sessionUserId: string,
    messageId: string
  ): Promise<User[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!messageId) throw new ValidationError("Message ID is required");

    try {
      const result = await prismaClient.message.findUnique({
        where: {
          id: messageId,
          chat: { members: { some: { userId: sessionUserId } } },
        },
        include: { seenBy: true },
      });
      return result?.seenBy || [];
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }
}
