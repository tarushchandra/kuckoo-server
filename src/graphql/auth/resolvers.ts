import { GraphqlContext } from "..";
import { AuthenticationError } from "../../express/utils/error";
import { AuthService } from "../../services/auth";

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
};

const mutations = {};

const extraResolvers = {};

export const resolvers = { queries, mutations, extraResolvers };
