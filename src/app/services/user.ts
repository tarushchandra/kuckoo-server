import axios from "axios";
import { prismaClient } from "../clients/prisma";
import { User } from "@prisma/client";
import JWT from "jsonwebtoken";

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

  private static async createUser(payload: GoogleTokenResult) {
    return prismaClient.user.create({
      data: {
        firstName: payload.given_name,
        lastName: payload.family_name,
        email: payload.email,
        profileImageURL: payload.picture,
      },
    });
  }

  private static async generateJwtToken(payload: User) {
    return JWT.sign({ id: payload.id, email: payload.email }, JWT_SECRET);
  }

  private static async getUserByEmail(payload: GoogleTokenResult) {
    return prismaClient.user.findUnique({
      where: { email: payload.email },
    });
  }

  public static async decodeJwtToken(token: string) {
    return JWT.verify(token, JWT_SECRET) as JwtUser;
  }

  // Service Functions (Queries and Mutations Resolvers)
  public static async getCustomUserToken(googleToken: string) {
    const decodedToken: GoogleTokenResult = await UserService.decodeGoogleToken(
      googleToken
    );

    let user: User | null = await UserService.getUserByEmail(decodedToken);
    if (!user) {
      user = await UserService.createUser(decodedToken);
    }

    const customToken = await UserService.generateJwtToken(user);
    return customToken;
  }

  public static async getUserById(payload: JwtUser) {
    return prismaClient.user.findUnique({ where: { id: payload.id } });
  }
}

export default UserService;
