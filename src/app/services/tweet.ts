import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { prismaClient } from "../clients/prisma";
import { ImageUploadInput, TweetInput } from "../graphql/tweet/resolvers";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../clients/aws";
import UserService from "./user";
import { Tweet, User } from "@prisma/client";

class TweetService {
  public static async createTweet(payload: TweetInput, sessionUserId: string) {
    const { content, imageURL } = payload;
    try {
      await prismaClient.tweet.create({
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

  public static async getAuthor(authorId: string) {
    try {
      return await prismaClient.user.findUnique({ where: { id: authorId } });
    } catch (err) {
      return err;
    }
  }

  public static async getAllTweets() {
    try {
      return await prismaClient.tweet.findMany();
    } catch (err) {
      return err;
    }
  }

  public static async deleteTweet(sessionUserId: string, tweetId: string) {
    try {
      await prismaClient.tweet.delete({
        where: { id: tweetId, authorId: sessionUserId },
      });
      return true;
    } catch (err) {
      return false;
    }
  }

  public static async updateTweet(
    sessionUserId: string,
    tweetId: string,
    payload: TweetInput
  ) {
    const { content, imageURL } = payload;
    try {
      await prismaClient.tweet.update({
        where: { id: tweetId, authorId: sessionUserId },
        data: { content, imageURL },
      });
      return true;
    } catch (err) {
      return false;
    }
  }

  public static async getSignedURLForUploadingTweet(
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

  public static async getTweetsFeed(sessionUserId: string) {
    try {
      const sessionUserFollowings = await UserService.getFollowings(
        sessionUserId,
        sessionUserId
      );

      let followingsTweets: any[] = [];
      for (const following of sessionUserFollowings) {
        const tweets = await UserService.getTweets(following.id);
        followingsTweets.push(tweets);
      }
      const sessionUserTweets: any = await UserService.getTweets(sessionUserId);

      const result = [];
      for (const tweets of followingsTweets) {
        result.push(...tweets);
      }
      result.push(...sessionUserTweets);

      result.sort((a, b) => Number(b?.createdAt) - Number(a?.createdAt));
      return result;
    } catch (err) {
      return err;
    }
  }
}

export default TweetService;
