import axios from "axios";
import JWT from "jsonwebtoken";
import UserService from "./user";
import { AuthenticationError } from "../utils/error";
import { Response } from "express";
import { signInInput } from "../graphql/auth/resolvers";
import { User } from "../../generated/prisma";

export interface GoogleTokenResult {
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
  username: string;
}

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

// Token expiration times
const accessTokenEpirationTimeInSeconds = 60;
const refreshTokenExpirationTimeInDays = 15;

export class AuthService {
  // Utility Functions
  public static async decodeGoogleToken(googleToken: String) {
    const URL = `https://oauth2.googleapis.com/tokeninfo?id_token=${googleToken}`;
    const { data } = await axios.get<GoogleTokenResult>(URL);
    return data;
  }

  private static async generateAccessToken(payload: User | JwtUser) {
    return JWT.sign(
      { id: payload.id, email: payload.email, username: payload.username },
      process.env.JWT_ACCESS_SECRET!,
      {
        expiresIn: `${accessTokenEpirationTimeInSeconds}s`,
      }
    );
  }

  private static async generateRefreshToken(payload: User | JwtUser) {
    return JWT.sign(
      { id: payload.id, email: payload.email, username: payload.username },
      process.env.JWT_REFRESH_SECRET!,
      {
        expiresIn: `${refreshTokenExpirationTimeInDays}d`,
      }
    );
  }

  public static async decodeAccessToken(token: string) {
    return JWT.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtUser;
  }

  public static async decodeRefreshToken(token: string) {
    return JWT.verify(token, process.env.JWT_REFRESH_SECRET!) as JwtUser;
  }

  private static attachCookiesToResponse(
    res: Response,
    accessToken: string,
    refreshToken: string
  ) {
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: accessTokenEpirationTimeInSeconds * 1000,
      path: "/",
    });

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: refreshTokenExpirationTimeInDays * 24 * 60 * 60 * 1000,
      path: "/",
    });
  }

  // ---------------------------------------------------------------------------------------------

  // Service functions

  public static async getTokens(res: Response, payload: signInInput) {
    try {
      let user: User;
      if (payload.googleToken)
        user = await UserService.signInWithGoogle(payload.googleToken);
      else user = await UserService.signInWithEmailAndPassword(payload.user);

      const accessToken = await AuthService.generateAccessToken(user);
      const refreshToken = await AuthService.generateRefreshToken(user);
      AuthService.attachCookiesToResponse(res, accessToken, refreshToken);
      return true;
    } catch (err) {
      throw err;
    }
  }

  public static async verifyRefreshToken(res: Response, refreshToken: string) {
    try {
      const user = await AuthService.decodeRefreshToken(refreshToken);
      if (!user) throw new AuthenticationError();

      const accessToken = await AuthService.generateAccessToken(user);
      const newRefreshToken = await AuthService.generateRefreshToken(user);
      AuthService.attachCookiesToResponse(res, accessToken, newRefreshToken);
      return true;
    } catch (err) {
      throw new AuthenticationError();
    }
  }
}
