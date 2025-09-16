import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import UserService from "./user";
import { ImageUploadInput, PostInput } from "../graphql/post/resolvers";
import { prismaClient } from "../clients/prisma";
import { s3Client } from "../clients/aws";

class PostService {
  public static async getPost(postId: string) {
    try {
      return await prismaClient.post.findUnique({ where: { id: postId } });
    } catch (err) {
      return err;
    }
  }

  public static async createPost(payload: PostInput, sessionUserId: string) {
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
      return false;
    }
  }

  public static async deletePost(sessionUserId: string, postId: string) {
    try {
      await prismaClient.post.delete({
        where: { id: postId, authorId: sessionUserId },
      });
      return true;
    } catch (err) {
      return false;
    }
  }

  public static async updatePost(
    sessionUserId: string,
    postId: string,
    payload: PostInput
  ) {
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
      return false;
    }
  }

  public static async getAllPosts() {
    try {
      return await prismaClient.post.findMany();
    } catch (err) {
      return err;
    }
  }

  public static async getSignedURLForUploadingPost(
    sessionUserId: string,
    payload: ImageUploadInput
  ) {
    const { imageName, imageType } = payload;

    const allowedImagesTypes = ["jpg", "jpeg", "png", "webp"];
    if (!allowedImagesTypes.includes(imageType))
      throw new Error("Unsupported Image Type");

    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `uploads/${sessionUserId}/images/${imageName}-${Date.now()}.${imageType}`,
    });

    const signedURL = await getSignedUrl(s3Client, putObjectCommand);
    return signedURL;
  }

  public static async getPostsFeed(
    sessionUserId: string,
    limit: number,
    cursor?: string
  ) {
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
      return err;
    }
  }

  public static async getPosts(
    targetUserId: string,
    limit: number = 4,
    cursor?: string
  ) {
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
      return err;
    }
  }

  public static async getPostsCount(targetUserId: string) {
    try {
      const posts = await prismaClient.post.findMany({
        where: { authorId: targetUserId },
      });
      return posts.length;
    } catch (err) {
      return err;
    }
  }
}

export default PostService;
