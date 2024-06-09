import { Chat } from "@prisma/client";
import { GraphqlContext } from "..";
import { ChatService, CreateMessagePayload } from "../../services/chat";

const queries = {
  getChats: async (_: any, {}, ctx: GraphqlContext) => {
    if (!ctx || !ctx.user?.id) return null;
    return await ChatService.getChats(ctx.user.id);
  },
  getChatMessages: async (
    _: any,
    { chatId }: { chatId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await ChatService.getMessages(ctx.user.id, chatId);
  },
  getChatMembers: async (
    _: any,
    { chatId }: { chatId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await ChatService.getChatMembers(ctx.user.id, chatId);
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
  addUsersToGroup: async (
    _: any,
    { chatId, targetUserIds }: { chatId: string; targetUserIds: string[] },
    ctx: GraphqlContext
  ) => {
    if (!ctx || !ctx.user?.id) return null;
    return await ChatService.addUsersToGroup(
      ctx.user.id,
      chatId,
      targetUserIds
    );
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
