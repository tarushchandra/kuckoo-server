import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import UserService from "./user";
import { ImageUploadInput, PostInput } from "../graphql/post/resolvers";
import { prismaClient } from "../clients/prisma";
import { s3Client } from "../clients/aws";
import {
  AuthorizationError,
  InternalServerError,
  isAppError,
  NotFoundError,
  toAppError,
  ValidationError,
} from "../utils/error";
import { Post } from "../../generated/prisma";

class PostService {
  public static async getPost(postId: string): Promise<Post> {
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      const post = await prismaClient.post.findUnique({
        where: { id: postId },
      });
      if (!post) throw new NotFoundError("Post not found", "Post");
      return post;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async createPost(
    payload: PostInput,
    sessionUserId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!payload.content && !payload.imagePathname)
      throw new ValidationError("Either post content or image is required");

    const { content, imagePathname } = payload;
    try {
      await prismaClient.post.create({
        data: {
          content,
          imageURL: imagePathname
            ? process.env.AWS_CLOUDFRONT_URL + imagePathname
            : null,
          author: { connect: { id: sessionUserId } },
        },
      });
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async deletePost(
    sessionUserId: string,
    postId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");

    try {
      await prismaClient.post.delete({
        where: { id: postId, authorId: sessionUserId },
      });
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async updatePost(
    sessionUserId: string,
    postId: string,
    payload: PostInput
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (!postId) throw new ValidationError("Post ID is required", "postId");
    if (!payload.content && !payload.imagePathname)
      throw new ValidationError("Either post content or image is required");

    const { content, imagePathname } = payload;
    try {
      await prismaClient.post.update({
        where: { id: postId, authorId: sessionUserId },
        data: {
          content,
          imageURL: process.env.AWS_CLOUDFRONT_URL + imagePathname,
          updatedAt: new Date(Date.now()),
        },
      });
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getAllPosts(): Promise<Post[]> {
    try {
      return await prismaClient.post.findMany({
        orderBy: { createdAt: "desc" },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getSignedURLForUploadingPost(
    sessionUserId: string,
    payload: ImageUploadInput
  ): Promise<string> {
    try {
      if (!sessionUserId)
        throw new ValidationError("Session user ID is required");
      if (!payload.imageName)
        throw new ValidationError("Image name is required", "imageName");
      if (!payload.imageType)
        throw new ValidationError("Image type is required", "imageType");
      if (!process.env.AWS_BUCKET_NAME)
        throw new InternalServerError("AWS S3 bucket configuration is missing");

      const { imageName, imageType } = payload;

      const allowedImagesTypes = ["jpg", "jpeg", "png", "webp"];
      if (!allowedImagesTypes.includes(imageType.toLowerCase()))
        throw new ValidationError(
          `Unsupported image type. Allowed types: ${allowedImagesTypes.join(
            ", "
          )}`,
          "imageType"
        );

      const putObjectCommand = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `uploads/${sessionUserId}/images/${imageName}-${Date.now()}.${imageType}`,
      });

      const signedURL = await getSignedUrl(s3Client, putObjectCommand);
      if (!signedURL)
        throw new InternalServerError("Could not generate signed URL");
      return signedURL;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getPostsFeed(
    sessionUserId: string,
    limit: number,
    cursor?: string
  ): Promise<{ posts: Post[]; nextCursor: string | null }> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required");
    if (limit <= 0 || limit > 100)
      throw new ValidationError("Limit must be between 1 and 100", "limit");

    try {
      const sessionUserFollowings = await UserService.getFollowings(
        sessionUserId,
        sessionUserId
      );
      const followingIds = sessionUserFollowings.map((x: any) => x.id);

      const posts = await prismaClient.post.findMany({
        where: { authorId: { in: [...followingIds, sessionUserId] } },
        orderBy: { createdAt: "desc" },
        cursor: cursor ? { id: cursor } : undefined,
        take: limit + 1,
        skip: cursor ? 1 : 0,
      });

      const hasNextPage = posts.length > limit;
      if (hasNextPage) posts.pop();
      return {
        posts,
        nextCursor: hasNextPage ? posts[posts.length - 1].id : null,
      };
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getPosts(
    targetUserId: string,
    limit: number = 4,
    cursor?: string
  ): Promise<{ posts: Post[]; nextCursor: string | null }> {
    if (!targetUserId)
      throw new ValidationError("Target user ID is required", "targetUserId");
    if (limit <= 0 || limit > 100)
      throw new ValidationError("Limit must be between 1 and 100", "limit");

    try {
      const posts = await prismaClient.post.findMany({
        where: { authorId: targetUserId },
        orderBy: { createdAt: "desc" },
        cursor: cursor ? { id: cursor } : undefined,
        take: limit + 1,
        skip: cursor ? 1 : 0,
      });

      const hasNextPage = posts.length > limit;
      if (hasNextPage) posts.pop();
      return {
        posts,
        nextCursor: hasNextPage ? posts[posts.length - 1].id : null,
      };
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getPostsCount(targetUserId: string): Promise<number> {
    if (!targetUserId)
      throw new ValidationError("Target user ID is required", "targetUserId");

    try {
      return await prismaClient.post.count({
        where: { authorId: targetUserId },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }
}

export default PostService;
