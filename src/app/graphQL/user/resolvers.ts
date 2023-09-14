import UserService from "../../services/user";
import { GraphqlContext } from "../index";

const queries = {
  getCustomUserToken: async (
    _: any,
    { googleToken }: { googleToken: string }
  ) => {
    try {
      return await UserService.getCustomUserToken(googleToken);
    } catch (err) {
      return err;
    }
  },
  getCurrentUser: async (_: any, args: any, context: GraphqlContext) => {
    if (!context.user) return null;
    try {
      return await UserService.getUserById(context.user);
    } catch (err) {
      return err;
    }
  },
};

const mutations = {};

export const resolvers = { queries, mutations };
