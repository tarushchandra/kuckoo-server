import { prismaClient } from "../clients/prisma";
import UserService from "./user";

export class TweetEngagementService {
  public static async getTweetEngagement(tweetId: string) {
    try {
      const result = await prismaClient.tweetEngagement.findUnique({
        where: {
          tweetId,
        },
        include: {
          tweet: true,
          likes: {
            include: {
              user: true,
              tweetEngagement: { include: { tweet: true } },
            },
          },
        },
      });

      //   console.log("result -", result);

      return result;
    } catch (err) {
      return err;
    }
  }

  private static async createTweetEngagement(tweetId: string) {
    return prismaClient.tweetEngagement.create({
      data: {
        tweet: { connect: { id: tweetId } },
      },
    });
  }

  private static async deleteTweetEngagement(tweetId: string) {
    return prismaClient.tweetEngagement.delete({
      where: { tweetId },
    });
  }

  private static async checkOrCreateTweetEngagement(tweetId: string) {
    const foundTweetEngagement =
      await TweetEngagementService.getTweetEngagement(tweetId);
    if (!foundTweetEngagement)
      await TweetEngagementService.createTweetEngagement(tweetId);
  }

  // ----------------------------------------------------------------------------------

  public static async isLikeExist(userId: string, tweetId: string) {
    try {
      const result = await prismaClient.like.findUnique({
        where: { userId_tweetId: { tweetId, userId } },
      });
      if (!result) return false;
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async getLikes(sessionUserId: string, tweetId: string) {
    try {
      const result = await prismaClient.like.findMany({
        where: { tweetId },
        include: {
          user: { include: { followings: { include: { follower: true } } } },
        },
      });

      const likes = result.map((like) => like.user);
      const rearrangedLikes =
        UserService.getRearrangedConnectionsBasedOnSessionUser(
          sessionUserId,
          likes
        );

      return rearrangedLikes;
    } catch (err) {
      return err;
    }
  }

  public static async getMutualLikers(sessionUserId: string, tweetId: string) {
    try {
      const result = await prismaClient.like.findMany({
        where: { tweetId },
        include: {
          user: { include: { followings: { include: { follower: true } } } },
        },
      });

      const likes = result.map((like) => like.user);
      const mutualLikes = UserService.getMutualConnections(
        sessionUserId,
        likes
      );

      return mutualLikes;
    } catch (err) {
      return err;
    }
  }

  public static async getLikesCount(tweetId: string) {
    try {
      const result = await prismaClient.like.findMany({ where: { tweetId } });
      return result.length;
    } catch (err) {
      return err;
    }
  }

  public static async likeTweet(sessionUserId: string, tweetId: string) {
    try {
      const isLikeExist = await TweetEngagementService.isLikeExist(
        sessionUserId,
        tweetId
      );
      if (isLikeExist) return false;

      await TweetEngagementService.checkOrCreateTweetEngagement(tweetId);

      await prismaClient.like.create({
        data: {
          user: { connect: { id: sessionUserId } },
          tweetEngagement: { connect: { tweetId } },
        },
      });
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async dislikeTweet(sessionUserId: string, tweetId: string) {
    try {
      const isLikeExist = await TweetEngagementService.isLikeExist(
        sessionUserId,
        tweetId
      );
      if (!isLikeExist) return false;

      await prismaClient.like.delete({
        where: {
          userId_tweetId: { tweetId, userId: sessionUserId },
        },
      });

      const likesCount = await TweetEngagementService.getLikesCount(tweetId);
      if (likesCount === 0)
        await TweetEngagementService.deleteTweetEngagement(tweetId);

      return true;
    } catch (err) {
      return err;
    }
  }
}
