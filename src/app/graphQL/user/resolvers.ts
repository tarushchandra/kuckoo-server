import UserService from "../../services/user";
import { GraphqlContext } from "../index";

const queries = {
  getCustomUserToken: async (
    _: any,
    { googleToken, user }: { googleToken?: string; user?: any }
  ) => {
    try {
      return await UserService.getCustomUserToken(googleToken, user);
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
  isUsernameExist: async (_: any, { username }: { username: string }) => {
    try {
      return await UserService.isUsernameExist(username);
    } catch (err) {
      return err;
    }
  },
  isEmailExist: async (_: any, { email }: { email: string }) => {
    try {
      return await UserService.isEmailExist(email);
    } catch (err) {
      return err;
    }
  },
};

const mutations = {
  createUserWithEmailAndPassword: async (_: any, { user }: { user: any }) => {
    try {
      return await UserService.signUpWithEmailAndPassword(user);
    } catch (err) {
      return err;
    }
  },
};

export const resolvers = { queries, mutations };
