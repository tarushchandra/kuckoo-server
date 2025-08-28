import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import UserService from "./user";
import { prismaClient } from "../express/clients/prisma";
import { ImageUploadInput, PostInput } from "../express/graphql/post/resolvers";
import { s3Client } from "../express/clients/aws";

class PostService {
  public static async getPost(postId: string) {
    try {
      return await prismaClient.post.findUnique({ where: { id: postId } });
    } catch (err) {
      return err;
    }
  }

  public static async createPost(payload: PostInput, sessionUserId: string) {
    const { content, imageURL } = payload;
    try {
      await prismaClient.post.create({
        data: {
          content,
          imageURL,
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
    const { content, imageURL } = payload;
    try {
      await prismaClient.post.update({
        where: { id: postId, authorId: sessionUserId },
        data: { content, imageURL, updatedAt: new Date(Date.now()) },
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
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: `uploads/${sessionUserId}/images/${imageName}-${Date.now()}.${imageType}`,
    });

    const signedURL = await getSignedUrl(s3Client, putObjectCommand);
    return signedURL;
  }

  // public static async getPostsFeed(
  //   sessionUserId: string,
  //   limit: number,
  //   cursor?: string
  // ) {
  //   try {
  //     const sessionUserFollowings = await UserService.getFollowings(
  //       sessionUserId,
  //       sessionUserId
  //     );

  //     let followingsPosts: any[] = [];
  //     for (const following of sessionUserFollowings) {
  //       const posts = await PostService.getPosts(following.id);
  //       followingsPosts.push(posts);
  //     }
  //     const sessionUserPosts: any = await PostService.getPosts(
  //       sessionUserId
  //     );

  //     const result = [];
  //     for (const posts of followingsPosts) {
  //       result.push(...posts);
  //     }
  //     result.push(...sessionUserPosts);

  //     result.sort((a, b) => Number(b?.createdAt) - Number(a?.createdAt));
  //     return result;
  //   } catch (err) {
  //     return err;
  //   }
  // }

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

  // public static async getPosts(targetUserId: string) {
  //   try {
  //     const posts = await prismaClient.post.findMany({
  //       where: { authorId: targetUserId },
  //       orderBy: { createdAt: "desc" },
  //     });

  //     console.log("user posts -", posts);

  //     return posts;
  //   } catch (err) {
  //     return err;
  //   }
  // }

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
