import { User } from "@prisma/client";
import UserService from "../../services/user";
import { GraphqlContext } from "../index";

const queries = {
  getCustomUserToken: async (
    _: any,
    { googleToken, user }: { googleToken?: string; user?: any }
  ) => await UserService.getCustomUserToken({ googleToken, user }),
  getSessionUser: async (_: any, args: any, ctx: GraphqlContext) => {
    if (!ctx.user) return null;
    return await UserService.getUserById(ctx.user);
  },
  getUser: async (_: any, { username }: { username: string }) => {
    console.log("getUser called -", username);
    return await UserService.getUserByUsername(username);
  },
  getAllUsers: async () => await UserService.getAllUsers(),
  isUsernameExist: async (_: any, { username }: { username: string }) =>
    await UserService.isUsernameExist(username),
  isEmailExist: async (_: any, { email }: { email: string }) =>
    await UserService.isEmailExist(email),
};

const mutations = {
  createUserWithEmailAndPassword: async (_: any, { user }: { user: any }) =>
    await UserService.signUpWithEmailAndPassword(user),
  followUser: async (_: any, { to }: { to: string }, ctx: GraphqlContext) => {
    if (!ctx.user || !ctx.user.id) return null;
    return await UserService.followUser(ctx.user?.id, to);
  },
  unfollowUser: async (_: any, { to }: { to: string }, ctx: GraphqlContext) => {
    if (!ctx.user || !ctx.user.id) return null;
    return await UserService.unfollowUser(ctx.user?.id, to);
  },
  removeFollower: async (
    _: any,
    { userId }: { userId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user || !ctx.user.id) return null;
    return await UserService.removeFollower(ctx.user.id, userId);
  },
};

const extraResolvers = {
  User: {
    followers: async (parent: User) =>
      await UserService.getFollowers(parent.id),
    followings: async (parent: User) =>
      await UserService.getFollowings(parent.id),
  },
};

export const resolvers = { queries, mutations, extraResolvers };
