import { User } from "@prisma/client";
import axios from "axios";
import JWT from "jsonwebtoken";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "../../middlewares/auth";
import UserService from "./user";

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

export class AuthService {
  // Utility Functions
  public static async decodeGoogleToken(googleToken: String) {
    const URL = `https://oauth2.googleapis.com/tokeninfo?id_token=${googleToken}`;
    const { data } = await axios.get<GoogleTokenResult>(URL);
    return data;
  }

  private static async generateAccessToken(payload: User) {
    return JWT.sign(
      { id: payload.id, email: payload.email, username: payload.username },
      process.env.JWT_ACCESS_SECRET!,
      {
        expiresIn: "10s",
      }
    );
  }

  private static async generateRefreshToken(payload: User) {
    return JWT.sign(
      { id: payload.id, email: payload.email, username: payload.username },
      process.env.JWT_REFRESH_SECRET!,
      {
        expiresIn: "7d",
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
    ctx: any,
    accessToken: string,
    refreshToken: string
  ) {
    ctx.res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 1000, // 10 seconds
      path: "/",
    });

    ctx.res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });
  }

  // ---------------------------------------------------------------------------------------------

  // Service functions

  public static async getCustomUserToken(payload: any, ctx: any) {
    try {
      let user: User;
      if (payload.googleToken)
        user = await UserService.signInWithGoogle(payload.googleToken);
      else user = await UserService.signInWithEmailAndPassword(payload.user);

      const accessToken = await AuthService.generateAccessToken(user);
      const refreshToken = await AuthService.generateRefreshToken(user);
      AuthService.attachCookiesToResponse(ctx, accessToken, refreshToken);

      return accessToken;
    } catch (err) {
      return err;
    }
  }

  public static async verifyRefreshToken(refreshToken: string, ctx: any) {
    try {
      if (!refreshToken) throw new Error("Refresh token missing");

      const user = await AuthService.decodeRefreshToken(refreshToken);
      const accessToken = await AuthService.generateAccessToken(user as User);
      const newRefreshToken = await AuthService.generateRefreshToken(
        user as User
      );

      AuthService.attachCookiesToResponse(ctx, accessToken, newRefreshToken);
      return true;
    } catch (err) {
      throw err;
    }
  }
}
