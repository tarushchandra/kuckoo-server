import UserService from "../../services/user";
import { GraphqlContext } from "..";
import PostService from "../../services/post";
import { requireAuthenticationAndGetUser } from "../../../middlewares/auth";
import { User } from "../../../generated/prisma";

const queries = {
  getSessionUser: async (_: any, args: any, ctx: GraphqlContext) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await UserService.getUserById(user.id);
  },
  getUser: async (_: any, { username }: { username: string }) => {
    console.log("getUser called -", username);
    return await UserService.getUserByUsername(username);
  },
  getMutualFollowers: async (
    _: any,
    { username }: { username: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await UserService.getMutualFollowers(user.id, username);
  },
  getRecommendedUsers: async (_: any, __: any, ctx: GraphqlContext) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await UserService.getRecommendedUsers(user.id);
  },
  getAllUsers: async (_: any, {}: any, ctx: GraphqlContext) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await UserService.getAllUsers(user.id);
  },
  getUsers: async (
    _: any,
    { searchText }: { searchText: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await UserService.getUsers(user.id, searchText);
  },
  isUsernameExist: async (_: any, { username }: { username: string }) =>
    await UserService.isUsernameExist(username),
  isEmailExist: async (_: any, { email }: { email: string }) =>
    await UserService.isEmailExist(email),
  isFollowing: async (
    _: any,
    { userId }: { userId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await UserService.isFollowing(user.id, userId);
  },
  getUserLastSeen: async (
    _: any,
    { userId }: { userId: string },
    ctx: GraphqlContext
  ) => {
    requireAuthenticationAndGetUser(ctx);
    return await UserService.getLastSeenAt(userId);
  },
};

const mutations = {
  createUserWithEmailAndPassword: async (_: any, { user }: { user: any }) =>
    await UserService.signUpWithEmailAndPassword(user),
  followUser: async (_: any, { to }: { to: string }, ctx: GraphqlContext) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await UserService.followUser(user?.id, to);
  },
  unfollowUser: async (_: any, { to }: { to: string }, ctx: GraphqlContext) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await UserService.unfollowUser(user?.id, to);
  },
  removeFollower: async (
    _: any,
    { userId }: { userId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await UserService.removeFollower(user.id, userId);
  },
};

const extraResolvers = {
  User: {
    followers: async (parent: User, _: any, ctx: GraphqlContext) => {
      const user = requireAuthenticationAndGetUser(ctx);
      return await UserService.getFollowers(user.id, parent.id);
    },
    followings: async (parent: User, _: any, ctx: GraphqlContext) => {
      const user = requireAuthenticationAndGetUser(ctx);
      return await UserService.getFollowings(user.id, parent.id);
    },
    followersCount: async (parent: User) =>
      await UserService.getFollowersCount(parent.id),
    followingsCount: async (parent: User) =>
      await UserService.getFollowingsCount(parent.id),
    postsCount: async (parent: User) =>
      await PostService.getPostsCount(parent.id),
  },
};

export const resolvers = { queries, mutations, extraResolvers };
