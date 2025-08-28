import { Post } from "@prisma/client";
import { GraphqlContext } from "..";
import { requireAuthenticationAndGetUser } from "../../middlewares/auth";
import PostService from "../../services/post";
import UserService from "../../services/user";
import { PostEngagementService } from "../../services/post-engagement";

export interface PostInput {
  content?: string;
  imageURL?: string;
}
export interface ImageUploadInput {
  imageName: string;
  imageType: string;
}

const queries = {
  getPost: async (_: any, { postId }: { postId: string }) =>
    await PostService.getPost(postId),
  getPaginatedPosts: async (
    _: any,
    {
      userId,
      limit,
      cursor,
    }: { userId: string; limit: number; cursor?: string }
  ) => {
    return await PostService.getPosts(userId, limit, cursor);
  },
  getAllPosts: async () => PostService.getAllPosts(),
  getSignedURLForUploadingImage: async (
    _: any,
    { payload }: { payload: ImageUploadInput },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostService.getSignedURLForUploadingPost(user.id, payload);
  },
  getPaginatedPostsFeed: async (
    _: any,
    { limit, cursor }: { limit: number; cursor?: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostService.getPostsFeed(user.id, limit, cursor);
  },
};

const mutations = {
  createPost: async (
    _: any,
    { payload }: { payload: PostInput },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostService.createPost(payload, user.id);
  },
  deletePost: async (
    _: any,
    { postId }: { postId: string },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostService.deletePost(user.id, postId);
  },
  updatePost: async (
    _: any,
    { postId, payload }: { postId: string; payload: PostInput },
    ctx: GraphqlContext
  ) => {
    const user = requireAuthenticationAndGetUser(ctx);
    return await PostService.updatePost(user.id, postId, payload);
  },
};

const extraResolvers = {
  Post: {
    author: async (parent: Post) =>
      await UserService.getUserById(parent.authorId),
    postEngagement: async (parent: Post) =>
      await PostEngagementService.getPostEngagement(parent.id),
  },
};

export const resolvers = { queries, mutations, extraResolvers };
