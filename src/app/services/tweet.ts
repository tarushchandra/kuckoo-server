import { prismaClient } from "../clients/prisma";
import { TweetInput } from "../graphql/tweet/resolvers";

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
}

export default TweetService;
