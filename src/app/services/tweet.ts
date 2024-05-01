import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { prismaClient } from "../clients/prisma";
import { ImageUploadInput, TweetInput } from "../graphql/tweet/resolvers";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../clients/aws";

class TweetService {
  public static async createTweet(payload: TweetInput, sessionUserId: string) {
    try {
      await prismaClient.tweet.create({
        data: {
          content: payload.content,
          imageURL: payload.imageURL,
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
    content: string
  ) {
    try {
      await prismaClient.tweet.update({
        where: { id: tweetId, authorId: sessionUserId },
        data: { content },
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

    console.log("imageType -", imageType);

    if (!allowedImagesTypes.includes(imageType))
      throw new Error("Unsupported Image Type");

    const putObjectCommand = new PutObjectCommand({
      Bucket: "twitter-clone-s3-bucket",
      Key: `uploads/${sessionUserId}/images/${imageName}-${Date.now()}.${imageType}`,
    });

    const signedURL = await getSignedUrl(s3Client, putObjectCommand);
    return signedURL;
  }
}

export default TweetService;
