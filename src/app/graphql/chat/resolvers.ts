import { Chat } from "@prisma/client";
import { GraphqlContext } from "..";
import { ChatService, CreateMessagePayload } from "../../services/chat";

const queries = {
  getChats: async (_: any, {}, ctx: GraphqlContext) => {
    if (!ctx || !ctx.user?.id) return null;
    return await ChatService.getChats(ctx.user.id);
  },
  getChat: async (
    _: any,
    { targetUserId }: { targetUserId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await ChatService.getChat(ctx.user.id, targetUserId);
  },
  getChatHistory: async (
    _: any,
    { chatId }: { chatId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await ChatService.getChatHistory(ctx.user.id, chatId);
  },
  getChatMembers: async (
    _: any,
    { chatId }: { chatId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await ChatService.getChatMembers(ctx.user.id, chatId);
  },
  getAvailableMembers: async (
    _: any,
    { chatId, searchText }: { chatId: string; searchText: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await ChatService.getAvailableMembers(
      ctx.user.id,
      chatId,
      searchText
    );
  },
};

const mutations = {
  createMessage: async (
    _: any,
    { payload }: { payload: CreateMessagePayload },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await ChatService.createMessage(ctx.user.id, payload);
  },
  createGroup: async (
    _: any,
    { targetUserIds, name }: { targetUserIds: string[]; name: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await ChatService.createGroup(ctx.user.id, name, targetUserIds);
  },
  addMembersToGroup: async (
    _: any,
    { chatId, targetUserIds }: { chatId: string; targetUserIds: string[] },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await ChatService.addMembersToGroup(
      ctx.user.id,
      chatId,
      targetUserIds
    );
  },
  renameGroup: async (
    _: any,
    { chatId, name }: { chatId: string; name: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await ChatService.renameGroup(ctx.user.id, chatId, name);
  },
};

const extraResolvers = {
  Chat: {
    latestMessage: async (parent: Chat, {}, ctx: GraphqlContext) => {
      if (!ctx || !ctx.user?.id) return null;
      return await ChatService.getLatestMessage(ctx.user.id, parent.id);
    },
    totalMembersCount: async (parent: Chat, {}, ctx: GraphqlContext) => {
      if (!ctx || !ctx.user?.id) return null;
      return await ChatService.getMembersCount(ctx.user.id, parent.id);
    },
  },
};

export const resolvers = { queries, mutations, extraResolvers };
