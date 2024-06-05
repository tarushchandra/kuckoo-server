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
};

const extraResolvers = {
  Chat: {
    latestMessage: async (parent: Chat, {}, ctx: GraphqlContext) => {
      if (!ctx || !ctx.user?.id) return null;
      return await ChatService.getLatestMessage(parent.id);
    },
  },
};

export const resolvers = { queries, mutations, extraResolvers };
