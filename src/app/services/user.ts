import axios from "axios";
import { prismaClient } from "../clients/prisma";
import { User } from "@prisma/client";
import JWT from "jsonwebtoken";
import bcrypt from "bcrypt";

interface GoogleTokenResult {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: string;
  nbf: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
  iat: string;
  exp: string;
  jti: string;
  alg: string;
  kid: string;
  typ: string;
}

export interface JwtUser {
  id: string;
  email: string;
}

const JWT_SECRET = "avicii@super1233";

class UserService {
  // Utility Functions
  private static async decodeGoogleToken(googleToken: String) {
    const URL = `https://oauth2.googleapis.com/tokeninfo?id_token=${googleToken}`;
    const { data } = await axios.get<GoogleTokenResult>(URL);
    return data;
  }

  // ---------------------------

  private static async hashPassword(password: string, saltRounds: number) {
    return await bcrypt.hash(password, saltRounds);
  }

  private static async compareHashedPassword(
    inputPassword: string,
    hashedPassword: string
  ) {
    return await bcrypt.compare(inputPassword, hashedPassword);
  }

  // ---------------------------

  private static async generateJwtToken(payload: User) {
    return JWT.sign({ id: payload.id, email: payload.email }, JWT_SECRET);
  }

  public static async decodeJwtToken(token: string) {
    return JWT.verify(token, JWT_SECRET) as JwtUser;
  }

  // ---------------------------

  private static async getUserByEmail(email: string) {
    return prismaClient.user.findUnique({
      where: { email },
    });
  }

  // ---------------------------

  public static async isUsernameExist(username: string) {
    try {
      const count = await prismaClient.user.count({
        where: { username },
      });
      return count > 0;
    } catch (err) {
      return err;
    }
  }

  public static async isEmailExist(email: string) {
    try {
      const count = await prismaClient.user.count({
        where: { email },
      });
      return count > 0;
    } catch (err) {
      return err;
    }
  }

  // ---------------------------

  private static async createUser(payload: any) {
    return prismaClient.user.create({
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        username: payload.username,
        profileImageURL: payload.profileImageURL && payload.profileImageURL,
        password:
          payload.password &&
          (await UserService.hashPassword(payload.password, 10)),
      },
    });
  }

  // ---------------------------

  private static async signInWithGoogle(googleToken: string) {
    const decodedToken: GoogleTokenResult = await UserService.decodeGoogleToken(
      googleToken
    );
    const { given_name, family_name, email, picture } = decodedToken;

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
  }

  private static async signInWithEmailAndPassword(inputUser: any) {
    const { email, password } = inputUser;
    let user = await UserService.getUserByEmail(email);

    if (!user || !user.password) {
      throw new Error("Credentials not found");
    }

    const isMatch = await UserService.compareHashedPassword(
      password,
      user.password
    );

    if (!isMatch) throw new Error("Password don't match");

    return user;
  }

  // --------------------------------------------------------------------------------------

  // Service Functions (Queries and Mutations Resolvers)
  public static async getCustomUserToken(payload: any) {
    try {
      let user: User;

      if (payload.googleToken) {
        user = await UserService.signInWithGoogle(payload.googleToken);
      } else {
        user = await UserService.signInWithEmailAndPassword(payload.user);
      }

      const customToken = await UserService.generateJwtToken(user);
      return customToken;
    } catch (err) {
      return err;
    }
  }

  public static async signUpWithEmailAndPassword(inputUser: any) {
    try {
      await UserService.createUser(inputUser);
      return true;
    } catch (err) {
      return err;
    }
  }

  public static async getUserById(userId: string) {
    try {
      return prismaClient.user.findUnique({ where: { id: userId } });
    } catch (err) {
      return err;
    }
  }

  public static async getUserByUsername(username: string) {
    return prismaClient.user.findUnique({
      where: { username },
    });
  }

  public static async getAllUsers(sessionUserId: string) {
    try {
      const result = await prismaClient.user.findMany();
      return result.filter((user) => user.id !== sessionUserId);
    } catch (err) {
      return err;
    }
  }

  // -----------------------------------------

  public static async followUser(from: string, to: string) {
    try {
      const data = await prismaClient.follows.create({
        data: {
          follower: { connect: { id: from } },
          following: { connect: { id: to } },
        },
      });
      return true;
    } catch (err) {
      return false;
    }
  }

  public static async unfollowUser(from: string, to: string) {
    try {
      const data = await prismaClient.follows.delete({
        where: {
          followerId_followingId: { followerId: from, followingId: to },
        },
      });
      return true;
    } catch (err) {
      return false;
    }
  }

  public static async getFollowers(userId: string) {
    try {
      const result = await prismaClient.follows.findMany({
        where: { followingId: userId },
        include: { follower: true },
      });
      return result.map((user) => user.follower);
    } catch (err) {
      return err;
    }
  }

  public static async getFollowings(userId: string) {
    try {
      const result = await prismaClient.follows.findMany({
        where: { followerId: userId },
        include: { following: true },
      });
      return result.map((user) => user.following) as User[];
    } catch (err) {
      return err;
    }
  }

  public static async removeFollower(sessionUserId: string, userId: string) {
    try {
      await prismaClient.follows.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: sessionUserId,
          },
        },
      });
      return true;
    } catch (err) {
      return false;
    }
  }

  public static async getRecommendedUsers(userId: string) {
    try {
      const myFollowings = await prismaClient.follows.findMany({
        where: { followerId: userId },
        include: {
          following: {
            include: { followers: { include: { following: true } } },
          },
        },
      });

      const users: User[] = [];
      for (const myFollowing of myFollowings) {
        const followingsOfMyFollowing = myFollowing.following.followers;
        for (const followingOfMyFollowing of followingsOfMyFollowing) {
          if (
            myFollowings.find(
              (myFollowing) =>
                myFollowing.followingId === followingOfMyFollowing.followingId
            ) ||
            followingOfMyFollowing.followingId === userId
          )
            continue;

          users.push(followingOfMyFollowing.following);
        }
      }
      return users;
    } catch (err) {
      return err;
    }
  }
}

export default UserService;
