import { GraphqlContext } from "..";
import { AuthService } from "../../services/auth";
import { AuthenticationError } from "../../utils/error";

export interface signInInput {
  googleToken?: string;
  user?: {
    email: string;
    password: string;
  };
}

const queries = {
  getTokens: async (_: any, payload: signInInput, ctx: GraphqlContext) =>
    await AuthService.getTokens(ctx.res, payload),

  verifyRefreshToken: async (_: any, {}: any, ctx: GraphqlContext) => {
    if (!ctx.refreshToken) throw new AuthenticationError();
    return await AuthService.verifyRefreshToken(ctx.res, ctx.refreshToken);
  },

  deleteTokens: async (_: any, {}: any, ctx: GraphqlContext) =>
    await AuthService.deleteCookies(ctx.res),
};

const mutations = {};

const extraResolvers = {};

export const resolvers = { queries, mutations, extraResolvers };
