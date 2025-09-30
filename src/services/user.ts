import bcrypt from "bcrypt";
import { NotificationService } from "./notification";
import { AuthService, GoogleTokenResult } from "./auth";
import { prismaClient } from "../clients/prisma";
import { redisClient } from "../clients/redis";
import { NotificationType, User } from "../../generated/prisma";
import {
  AuthenticationError,
  isAppError,
  NotFoundError,
  toAppError,
  ValidationError,
} from "../utils/error";

class UserService {
  // Utility functions
  private static async hashPassword(
    password: string,
    saltRounds: number
  ): Promise<string> {
    try {
      return await bcrypt.hash(password, saltRounds);
    } catch (err) {
      throw toAppError(err);
    }
  }

  private static async compareHashedPassword(
    inputPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(inputPassword, hashedPassword);
    } catch (err) {
      throw toAppError(err);
    }
  }

  private static async createUser(payload: any): Promise<User> {
    if (!payload.firstName)
      throw new ValidationError("First name is required", "firstName");
    if (!payload.lastName)
      throw new ValidationError("Last name is required", "lastName");
    if (!payload.email) throw new ValidationError("Email is required", "email");
    if (!payload.username)
      throw new ValidationError("Username is required", "username");
    if (!payload.password)
      throw new ValidationError("Password is required", "password");

    try {
      const isEmailExist = await UserService.isEmailExist(payload.email);
      if (isEmailExist)
        throw new ValidationError("Email already exists", "email");

      const isUsernameExist = await UserService.isUsernameExist(
        payload.username
      );
      if (isUsernameExist)
        throw new ValidationError("Username already exists", "username");

      return prismaClient.user.create({
        data: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          username: payload.username,
          profileImageURL: payload.profileImageURL || null,
          password: payload.password
            ? await UserService.hashPassword(payload.password, 10)
            : null,
        },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getUserByEmail(email: string): Promise<User | null> {
    if (!email) throw new ValidationError("Email is required", "email");

    try {
      return prismaClient.user.findUnique({
        where: { email },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async isUsernameExist(username: string): Promise<boolean> {
    if (!username)
      throw new ValidationError("Username is required", "username");

    try {
      const count = await prismaClient.user.count({
        where: { username },
      });
      return count > 0;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async isEmailExist(email: string): Promise<boolean> {
    if (!email) throw new ValidationError("Email is required", "email");

    try {
      const count = await prismaClient.user.count({
        where: { email },
      });
      return count > 0;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  // ---------------------------

  public static async signInWithGoogle(googleToken: string): Promise<User> {
    if (!googleToken)
      throw new ValidationError("Google token is required", "googleToken");

    try {
      const decodedToken: GoogleTokenResult =
        await AuthService.decodeGoogleToken(googleToken);
      const { given_name, family_name, email, picture } = decodedToken;
      if (!email)
        throw new ValidationError("Email not found in Google token", "email");

      let user = await UserService.getUserByEmail(email);
      if (!user) {
        user = await UserService.createUser({
          firstName: given_name,
          lastName: family_name,
          email: email,
          username: email.split("@")[0],
          profileImageURL: picture,
        });
      }

      return user;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async signInWithEmailAndPassword(payload: {
    email: string;
    password: string;
  }): Promise<User> {
    const { email, password } = payload;
    if (!email) throw new ValidationError("Email is required", "email");
    if (!password)
      throw new ValidationError("Password is required", "password");

    try {
      let user = await UserService.getUserByEmail(email);
      if (!user || !user.password)
        throw new AuthenticationError("Credentials not found");

      const isMatch = await UserService.compareHashedPassword(
        password,
        user.password
      );
      if (!isMatch) throw new AuthenticationError("Credentials not found");

      return user;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  // --------------------------------------------------------------------------------------

  // Service Functions (Queries and Mutations Resolvers)
  public static async signUpWithEmailAndPassword(
    payload: any
  ): Promise<boolean> {
    if (!payload) throw new ValidationError("User data is required", "user");

    try {
      await UserService.createUser(payload);
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getUserById(userId: string) {
    if (!userId) throw new ValidationError("User ID is required", "userId");

    try {
      return await prismaClient.user.findUnique({
        where: { id: userId },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getUserByUsername(
    username: string
  ): Promise<User | null> {
    if (!username)
      throw new ValidationError("Username is required", "username");

    try {
      const cachedUser = await redisClient.get(`USER:${username}`);
      if (cachedUser) return JSON.parse(cachedUser);

      const result = await prismaClient.user.findUnique({
        where: { username },
      });
      await redisClient.set(`USER:${result?.id}`, JSON.stringify(result));
      return result;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getAllUsers(sessionUserId: string): Promise<User[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required", "sessionUserId");

    try {
      return await prismaClient.user.findMany({
        where: { NOT: { id: sessionUserId } },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getUsers(
    sessionUserId: string,
    searchText: string
  ): Promise<User[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required", "sessionUserId");
    if (!searchText)
      throw new ValidationError("Search text is required", "searchText");
    if (searchText.length === 0) return [];

    try {
      return await prismaClient.user.findMany({
        where: {
          NOT: { id: sessionUserId },
          OR: [
            {
              firstName: {
                contains:
                  searchText.length > 1
                    ? searchText.slice(0, 1).toUpperCase() + searchText.slice(1)
                    : searchText,
              },
            },
            {
              lastName: {
                contains:
                  searchText.length > 1
                    ? searchText.slice(0, 1).toUpperCase() + searchText.slice(1)
                    : searchText,
              },
            },
            {
              username:
                searchText.length > 1
                  ? { equals: searchText }
                  : { contains: searchText },
            },
          ],
        },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getUsersWithout(
    sessionUserId: string,
    targetUserIds: string[],
    searchText: string
  ): Promise<User[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required", "sessionUserId");
    if (!searchText)
      throw new ValidationError("Search text is required", "searchText");
    if (!targetUserIds)
      throw new ValidationError(
        "Target user IDs are required",
        "targetUserIds"
      );
    if (!Array.isArray(targetUserIds))
      throw new ValidationError(
        "Target user IDs must be an array",
        "targetUserIds"
      );

    if (searchText.length === 0) return [];

    try {
      return await prismaClient.user.findMany({
        where: {
          AND: [sessionUserId, ...targetUserIds].map((memberId) => ({
            NOT: { id: memberId },
          })),
          OR: [
            {
              firstName: {
                contains:
                  searchText.length > 1
                    ? searchText.slice(0, 1).toUpperCase() + searchText.slice(1)
                    : searchText,
              },
            },
            {
              lastName: {
                contains:
                  searchText.length > 1
                    ? searchText.slice(0, 1).toUpperCase() + searchText.slice(1)
                    : searchText,
              },
            },
            {
              username:
                searchText.length > 1
                  ? { equals: searchText }
                  : { contains: searchText },
            },
          ],
        },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  // -----------------------------------------

  public static async followUser(from: string, to: string): Promise<boolean> {
    if (!from) throw new ValidationError("Follower ID is required", "from");
    if (!to) throw new ValidationError("Following ID is required", "to");
    if (from === to) throw new ValidationError("You cannot follow yourself");

    try {
      // check if the follow relationship already exists
      const isExistingFollowExist = await prismaClient.follows.findUnique({
        where: {
          followerId_followingId: { followerId: from, followingId: to },
        },
      });
      if (isExistingFollowExist)
        throw new ValidationError("You are already following this user", "to");

      // create the follow relationship
      await prismaClient.follows.create({
        data: {
          follower: { connect: { id: from } },
          following: { connect: { id: to } },
        },
      });

      // create notification
      await NotificationService.createNotification(
        NotificationType.FOLLOW,
        from,
        to
      );

      // invalidate relevant caches
      await Promise.all([
        redisClient.del(`FOLLOWERS_COUNT:${to}`),
        redisClient.del(`FOLLOWINGS_COUNT:${from}`),
        redisClient.del(`RECOMMENDED_USERS:${from}`),
      ]);

      // invalidate mutual followers cache for the followed user except the session user
      const cachedMutualFollowers = await redisClient.keys(
        `MUTUAL_FOLLOWERS:*:${to}`
      );
      await Promise.all(
        cachedMutualFollowers
          .filter((cachedKey) => !cachedKey.includes(from))
          .map((cachedKey) => redisClient.del(cachedKey))
      );

      // Clear followers and followings lists
      const [cachedSessionUserFollowersList, cachedSessionUserFollowingsList] =
        await Promise.all([
          redisClient.keys(`TOTAL_FOLLOWERS:${from}:*`),
          redisClient.keys(`TOTAL_FOLLOWINGS:${from}:*`),
        ]);
      await Promise.all([
        ...cachedSessionUserFollowersList.map((key) => redisClient.del(key)),
        ...cachedSessionUserFollowingsList.map((key) => redisClient.del(key)),
        redisClient.del(`TOTAL_FOLLOWERS:${to}:${to}`),
      ]);

      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async unfollowUser(from: string, to: string): Promise<boolean> {
    if (!from) throw new ValidationError("Follower ID is required", "from");
    if (!to) throw new ValidationError("Following ID is required", "to");
    if (from === to) throw new ValidationError("You cannot unfollow yourself");

    try {
      // Check if follow relationship exists
      const isExistingFollowExist = await prismaClient.follows.findUnique({
        where: {
          followerId_followingId: { followerId: from, followingId: to },
        },
      });
      if (!isExistingFollowExist)
        throw new ValidationError(
          "You are already not following this user",
          "to"
        );

      // delete the follow relationship
      await prismaClient.follows.delete({
        where: {
          followerId_followingId: { followerId: from, followingId: to },
        },
      });

      // delete notification
      await NotificationService.deleteNotification(
        NotificationType.FOLLOW,
        from,
        to
      );

      // invalidate relevant caches
      await Promise.all([
        redisClient.del(`FOLLOWERS_COUNT:${to}`),
        redisClient.del(`FOLLOWINGS_COUNT:${from}`),
        redisClient.del(`RECOMMENDED_USERS:${from}`),
      ]);

      const cachedMutualFollowers = await redisClient.keys(
        `MUTUAL_FOLLOWERS:*:${to}`
      );
      await Promise.all(
        cachedMutualFollowers
          .filter((key) => !key.includes(from))
          .map((key) => redisClient.del(key))
      );

      // Clear followers and followings lists
      const [sessionUserFollowersList, sessionUserFollowingsList] =
        await Promise.all([
          redisClient.keys(`TOTAL_FOLLOWERS:${from}:*`),
          redisClient.keys(`TOTAL_FOLLOWINGS:${from}:*`),
        ]);
      await Promise.all([
        ...sessionUserFollowersList.map((key) => redisClient.del(key)),
        ...sessionUserFollowingsList.map((key) => redisClient.del(key)),
        redisClient.del(`TOTAL_FOLLOWERS:${to}:${to}`),
      ]);

      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async removeFollower(
    sessionUserId: string,
    targetUserId: string
  ): Promise<boolean> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required", "sessionUserId");
    if (!targetUserId)
      throw new ValidationError("Target user ID is required", "targetUserId");
    if (sessionUserId === targetUserId)
      throw new ValidationError("You cannot remove yourself");

    try {
      // Check if follow relationship exists
      await prismaClient.follows.delete({
        where: {
          followerId_followingId: {
            followerId: targetUserId,
            followingId: sessionUserId,
          },
        },
      });

      // invalidate relevant caches
      await Promise.all([
        redisClient.del(`FOLLOWERS_COUNT:${sessionUserId}`),
        redisClient.del(`FOLLOWINGS_COUNT:${targetUserId}`),
        redisClient.del(`RECOMMENDED_USERS:${targetUserId}`),
      ]);

      // Clear cached lists
      const [
        cachedMutualFollowers,
        cachedTargetUserFollowersList,
        cachedTargetUserFollowingsList,
      ] = await Promise.all([
        redisClient.keys(`MUTUAL_FOLLOWERS:*:${sessionUserId}`),
        redisClient.keys(`TOTAL_FOLLOWERS:${targetUserId}:*`),
        redisClient.keys(`TOTAL_FOLLOWINGS:${targetUserId}:*`),
      ]);

      // invalidate mutual followers cache for the session user except the target user
      await Promise.all([
        ...cachedMutualFollowers
          .filter((key) => !key.includes(targetUserId))
          .map((key) => redisClient.del(key)),
        ...cachedTargetUserFollowersList.map((key) => redisClient.del(key)),
        ...cachedTargetUserFollowingsList.map((key) => redisClient.del(key)),
        redisClient.del(`TOTAL_FOLLOWERS:${sessionUserId}:${sessionUserId}`),
      ]);

      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getFollowers(
    sessionUserId: string,
    targetUserId: string
  ): Promise<User[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required", "sessionUserId");
    if (!targetUserId)
      throw new ValidationError("Target user ID is required", "targetUserId");

    try {
      const cachedFollowers = await redisClient.get(
        `TOTAL_FOLLOWERS:${sessionUserId}:${targetUserId}`
      );
      if (cachedFollowers) return JSON.parse(cachedFollowers);

      const result = await prismaClient.follows.findMany({
        where: { followingId: targetUserId },
        include: {
          follower: {
            include: { followings: { include: { follower: true } } },
          },
        },
      });
      const followers = result.map((follow) => follow.follower);

      const rearrangedFollowers =
        UserService.getRearrangedConnectionsBasedOnSessionUser(
          sessionUserId,
          followers
        );
      await redisClient.set(
        `TOTAL_FOLLOWERS:${sessionUserId}:${targetUserId}`,
        JSON.stringify(rearrangedFollowers)
      );

      return rearrangedFollowers;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getFollowings(
    sessionUserId: string,
    targetUserId: string
  ): Promise<User[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required", "sessionUserId");
    if (!targetUserId)
      throw new ValidationError("Target user ID is required", "targetUserId");

    try {
      const cachedFollowings = await redisClient.get(
        `TOTAL_FOLLOWINGS:${sessionUserId}:${targetUserId}`
      );
      if (cachedFollowings) return JSON.parse(cachedFollowings);

      const result = await prismaClient.follows.findMany({
        where: { followerId: targetUserId },
        include: {
          following: {
            include: { followings: { include: { follower: true } } },
          },
        },
      });
      const followings = result.map((follow) => follow.following);

      const rearrangedFollowings =
        UserService.getRearrangedConnectionsBasedOnSessionUser(
          sessionUserId,
          followings
        );
      await redisClient.set(
        `TOTAL_FOLLOWINGS:${sessionUserId}:${targetUserId}`,
        JSON.stringify(rearrangedFollowings)
      );
      return rearrangedFollowings;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getFollowersCount(targetUserId: string): Promise<number> {
    if (!targetUserId)
      throw new ValidationError("Target user ID is required", "targetUserId");

    try {
      const followersCount = await prismaClient.follows.count({
        where: { followingId: targetUserId },
      });

      redisClient.set(`FOLLOWERS_COUNT:${targetUserId}`, followersCount);
      return followersCount;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getFollowingsCount(
    targetUserId: string
  ): Promise<number> {
    if (!targetUserId)
      throw new ValidationError("Target user ID is required", "targetUserId");

    try {
      const followingsCount = await prismaClient.follows.count({
        where: { followerId: targetUserId },
      });

      redisClient.set(`FOLLOWINGS_COUNT:${targetUserId}`, followingsCount);
      return followingsCount;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async isFollowing(
    sessionUserId: string,
    targetUserId: string
  ): Promise<boolean | null> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required", "sessionUserId");
    if (!targetUserId)
      throw new ValidationError("Target user ID is required", "targetUserId");
    if (sessionUserId === targetUserId) return null;

    try {
      const amIFollowing = await prismaClient.follows.findUnique({
        where: {
          followerId_followingId: {
            followerId: sessionUserId,
            followingId: targetUserId,
          },
        },
      });

      if (!amIFollowing) return false;
      return true;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getMutualFollowers(
    sessionUserId: string,
    targetUsername: string
  ): Promise<User[]> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required", "sessionUserId");
    if (!targetUsername)
      throw new ValidationError(
        "Target username is required",
        "targetUsername"
      );

    try {
      // get target user by username
      const targetUser = await UserService.getUserByUsername(targetUsername);
      if (!targetUser || !targetUser.id)
        throw new NotFoundError("Target User not found", "targetUser");

      // check in cache
      const cachedMutualFollowers = await redisClient.get(
        `MUTUAL_FOLLOWERS:${sessionUserId}:${targetUser.id}`
      );
      if (cachedMutualFollowers) return JSON.parse(cachedMutualFollowers);

      const result = await prismaClient.follows.findMany({
        where: { followingId: targetUser.id },
        include: {
          follower: {
            include: { followings: { include: { follower: true } } },
          },
        },
      });

      // extract followers of target user and find mutual followers
      const targetUserFollowers = result.map((follow) => follow.follower);
      const mutualFollowers = UserService.getMutualConnections(
        sessionUserId,
        targetUserFollowers
      );

      // store in cache
      await redisClient.set(
        `MUTUAL_FOLLOWERS:${sessionUserId}:${targetUser.id}`,
        JSON.stringify(mutualFollowers)
      );

      return mutualFollowers;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getRecommendedUsers(userId: string): Promise<User[]> {
    if (!userId) throw new ValidationError("User ID is required", "userId");

    try {
      const cachedRecommendedUsers = await redisClient.get(
        `RECOMMENDED_USERS:${userId}`
      );
      if (cachedRecommendedUsers) return JSON.parse(cachedRecommendedUsers);

      const myFollowings = await prismaClient.follows.findMany({
        where: { followerId: userId },
        include: {
          following: {
            include: { followers: { include: { following: true } } },
          },
        },
      });

      const recommendedUsers: User[] = [];
      const recommendedUsersSet = new Set<string>();

      for (const myFollowing of myFollowings) {
        const followingsOfMyFollowing = myFollowing.following.followers;
        for (const followingOfMyFollowing of followingsOfMyFollowing) {
          // neglect if session user already follows this user.
          if (
            myFollowings.find(
              (myFollowing) =>
                myFollowing.followingId === followingOfMyFollowing.followingId
            )
          )
            continue;

          // neglect if session user is being recommended.
          if (followingOfMyFollowing.followingId === userId) continue;

          // neglect if same user is recommended twice.
          if (
            recommendedUsersSet.has(followingOfMyFollowing.following.username)
          )
            continue;

          recommendedUsersSet.add(followingOfMyFollowing.following.username);
          recommendedUsers.push(followingOfMyFollowing.following);
        }
      }

      // cache the recommended users
      await redisClient.set(
        `RECOMMENDED_USERS:${userId}`,
        JSON.stringify(recommendedUsers)
      );

      return recommendedUsers;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async setLastSeenAt(
    sessionUserId: string,
    lastSeenAt: number
  ): Promise<void> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required", "sessionUserId");
    if (!lastSeenAt || typeof lastSeenAt !== "number" || lastSeenAt <= 0)
      throw new ValidationError(
        "Valid lastSeenAt timestamp is required",
        "lastSeenAt"
      );

    try {
      await prismaClient.user.update({
        where: { id: sessionUserId },
        data: { lastSeenAt: new Date(lastSeenAt) },
      });
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  public static async getLastSeenAt(
    sessionUserId: string
  ): Promise<Date | null> {
    if (!sessionUserId)
      throw new ValidationError("Session user ID is required", "sessionUserId");

    try {
      const result = await prismaClient.user.findUnique({
        where: { id: sessionUserId },
        select: { lastSeenAt: true },
      });
      return result?.lastSeenAt || null;
    } catch (err) {
      if (isAppError(err)) throw err;
      throw toAppError(err);
    }
  }

  // Social Connection Functions

  public static getSessionUserAsConnection(
    sessionUserId: string,
    connections: User[]
  ): User | undefined {
    for (const myConnection of connections) {
      if (myConnection?.id === sessionUserId) return myConnection;
    }
  }

  public static getMutualConnections(
    sessionUserId: string,
    connections: any[]
  ): User[] {
    const mutualConnections: User[] = [];

    for (const myConnection of connections) {
      const followersOfMyConnection = myConnection.followings.map(
        (follow: any) => follow.follower
      );

      for (const followerOfMyConnection of followersOfMyConnection) {
        if (followerOfMyConnection.id !== sessionUserId) continue;
        mutualConnections.push(myConnection);
      }
    }
    return mutualConnections;
  }

  public static getRemainingConnections(
    sessionUserId: string,
    connections: User[],
    mutualConnections: User[]
  ): User[] {
    if (mutualConnections.length === 0)
      return connections.filter(
        (myConnection) => myConnection?.id !== sessionUserId
      ) as User[];

    const remainingConnections: User[] = [];
    for (const myConnection of connections) {
      const isMutualConnection = mutualConnections.find(
        (mutualConnection) => myConnection?.id === mutualConnection.id
      );
      if (isMutualConnection) continue;
      if (myConnection?.id === sessionUserId) continue;
      remainingConnections.push(myConnection as User);
    }
    return remainingConnections;
  }

  public static getRearrangedConnectionsBasedOnSessionUser(
    sessionUserId: string,
    connections: User[]
  ) {
    const sessionUserAsConnection = UserService.getSessionUserAsConnection(
      sessionUserId,
      connections
    );

    const mutualConnections = UserService.getMutualConnections(
      sessionUserId,
      connections
    );

    const remainingConnections = UserService.getRemainingConnections(
      sessionUserId,
      connections,
      mutualConnections
    );

    if (!sessionUserAsConnection)
      return [...mutualConnections, ...remainingConnections];
    return [
      sessionUserAsConnection,
      ...mutualConnections,
      ...remainingConnections,
    ];
  }
}

export default UserService;
