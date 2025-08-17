import { Chat } from "@prisma/client";
import { GraphqlContext } from "..";
import { ChatService, CreateMessagePayload } from "../../services/chat";
import { requireAuthenticationAndGetUser } from "../../../middlewares/auth";

const queries = {
  getChats: async (_: any, {}, ctx: GraphqlContext) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await ChatService.getChats(user.id);
  },
  getChat: async (
    _: any,
    { targetUserId }: { targetUserId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await ChatService.getChat(user.id, targetUserId);
  },
  getChatHistory: async (
    _: any,
    { chatId }: { chatId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await ChatService.getChatHistory(user.id, chatId);
  },
  getChatMembers: async (
    _: any,
    { chatId }: { chatId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await ChatService.getChatMembers(user.id, chatId);
  },
  getAvailableMembers: async (
    _: any,
    { chatId, searchText }: { chatId: string; searchText: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await ChatService.getAvailableMembers(user.id, chatId, searchText);
  },
  getUnseenChatsCount: async (_: any, {}, ctx: GraphqlContext) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await ChatService.getUnseenChatsCount(user.id);
  },
  getPeopleWithMessageSeen: async (
    _: any,
    { messageId }: { messageId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await ChatService.getPeopleWithMessageSeen(user.id, messageId);
  },
};

const mutations = {
  createGroup: async (
    _: any,
    { targetUserIds, name }: { targetUserIds: string[]; name: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await ChatService.createGroup(user.id, name, targetUserIds);
  },
  renameGroup: async (
    _: any,
    { chatId, name }: { chatId: string; name: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await ChatService.renameGroup(user.id, chatId, name);
  },
  addMembersToGroup: async (
    _: any,
    { chatId, targetUserIds }: { chatId: string; targetUserIds: string[] },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await ChatService.addMembersToGroup(user.id, chatId, targetUserIds);
  },
  removeMemberFromGroup: async (
    _: any,
    { chatId, targetUserId }: { chatId: string; targetUserId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await ChatService.removeMemberFromGroup(
      user.id,
      chatId,
      targetUserId
    );
  },
  makeGroupAdmin: async (
    _: any,
    { chatId, targetUserId }: { chatId: string; targetUserId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await ChatService.makeGroupAdmin(user.id, chatId, targetUserId);
  },
  removeGroupAdmin: async (
    _: any,
    { chatId, targetUserId }: { chatId: string; targetUserId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await ChatService.removeGroupAdmin(user.id, chatId, targetUserId);
  },
  leaveGroup: async (
    _: any,
    { chatId }: { chatId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await ChatService.leaveGroup(user.id, chatId);
  },
  seenBy: async (
    _: any,
    { chatId, messageIds }: { chatId: string; messageIds: string[] },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await ChatService.setMessagesAsSeen(user.id, chatId, messageIds);
  },
};

const extraResolvers = {
  Chat: {
    latestChatContent: async (parent: Chat) => {
      const result = await ChatService.getLatestChatContent(parent.id);
      return result;
    },

    latestMessage: async (parent: Chat, {}, ctx: GraphqlContext) => {
      const user = requireAuthenticationAndGetUser(ctx);
      return await ChatService.getLatestMessage(user.id, parent.id);
    },
    totalMembersCount: async (parent: Chat, {}, ctx: GraphqlContext) => {
      const user = requireAuthenticationAndGetUser(ctx);
      return await ChatService.getMembersCount(user.id, parent.id);
    },
    unseenMessagesCount: async (parent: Chat, {}, ctx: GraphqlContext) => {
      const user = requireAuthenticationAndGetUser(ctx);
      return await ChatService.getUnseenMessagesCount(user.id, parent.id);
    },
  },
};

export const resolvers = { queries, mutations, extraResolvers };
