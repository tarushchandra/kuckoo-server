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
  setAuthCookies: async (_: any, payload: signInInput, ctx: GraphqlContext) =>
    await AuthService.setAuthCookies(ctx.res, payload),

  verifyRefreshToken: async (_: any, {}: any, ctx: GraphqlContext) => {
    if (!ctx.refreshToken)
      throw new AuthenticationError("Refresh token is required");
    return await AuthService.verifyRefreshToken(ctx.res, ctx.refreshToken);
  },

  deleteAuthCookies: async (_: any, {}: any, ctx: GraphqlContext) =>
    await AuthService.deleteAuthCookies(ctx.res),
};

const mutations = {};

const extraResolvers = {};

export const resolvers = { queries, mutations, extraResolvers };
