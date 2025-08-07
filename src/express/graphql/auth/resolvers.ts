import { GraphqlContext } from "..";
import { AuthService } from "../../services/auth";

const queries = {
  getCustomUserToken: async (
    _: any,
    { googleToken, user }: { googleToken?: string; user?: any },
    ctx: GraphqlContext
  ) => await AuthService.getCustomUserToken({ googleToken, user }, ctx),
  verifyRefreshToken: async (
    _: any,
    { refreshToken }: { refreshToken: string },
    ctx: GraphqlContext
  ) => {
    return await AuthService.verifyRefreshToken(refreshToken, ctx);
  },
};

const mutations = {};

const extraResolvers = {};

export const resolvers = { queries, mutations, extraResolvers };
