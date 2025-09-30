import axios from "axios";
import JWT from "jsonwebtoken";
import UserService from "./user";
import { Response } from "express";
import { signInInput } from "../graphql/auth/resolvers";
import {
  AuthenticationError,
  InternalServerError,
  NotFoundError,
  ValidationError,
} from "../utils/error";
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
const accessTokenEpirationTimeInMinutes = 2;
const refreshTokenExpirationTimeInDays = 30;

export class AuthService {
  // Utility Functions
  public static async decodeGoogleToken(googleToken: String) {
    if (!googleToken || typeof googleToken !== "string")
      throw new ValidationError("Invalid google token");

    try {
      const URL = `https://oauth2.googleapis.com/tokeninfo?id_token=${googleToken}`;
      const { data } = await axios.get<GoogleTokenResult>(URL);
      return data;
    } catch (err) {
      throw new AuthenticationError("Failed to verify google token");
    }
  }

  private static async generateAccessToken(payload: User | JwtUser) {
    if (!payload || !payload.id || !payload.email || !payload.username)
      throw new ValidationError("Invalid user payload for token generation");
    if (!process.env.JWT_ACCESS_SECRET)
      throw new InternalServerError(
        "JWT_ACCESS_SECRET not set in environment variables"
      );

    try {
      return JWT.sign(
        { id: payload.id, email: payload.email, username: payload.username },
        process.env.JWT_ACCESS_SECRET,
        {
          expiresIn: `${accessTokenEpirationTimeInMinutes}m`,
        }
      );
    } catch (err) {
      throw new InternalServerError(
        "Failed to generate access token",
        err as Error
      );
    }
  }

  private static async generateRefreshToken(payload: User | JwtUser) {
    if (!payload || !payload.id || !payload.email || !payload.username)
      throw new ValidationError("Invalid user payload for token generation");
    if (!process.env.JWT_REFRESH_SECRET)
      throw new InternalServerError(
        "JWT_REFRESH_SECRET not set in environment variables"
      );

    try {
      return JWT.sign(
        { id: payload.id, email: payload.email, username: payload.username },
        process.env.JWT_REFRESH_SECRET,
        {
          expiresIn: `${refreshTokenExpirationTimeInDays}d`,
        }
      );
    } catch (err) {
      throw new InternalServerError(
        "Failed to generate refresh token",
        err as Error
      );
    }
  }

  public static async decodeAccessToken(token: string) {
    if (!token || typeof token !== "string")
      throw new ValidationError("Access token is required");
    if (!process.env.JWT_ACCESS_SECRET)
      throw new InternalServerError(
        "JWT_ACCESS_SECRET not set in environment variables"
      );

    try {
      return JWT.verify(token, process.env.JWT_ACCESS_SECRET) as JwtUser;
    } catch (err) {
      if (err instanceof JWT.JsonWebTokenError)
        throw new AuthenticationError("Invalid access token");
      if (err instanceof JWT.TokenExpiredError)
        throw new AuthenticationError("Access token has expired");
      throw new InternalServerError(
        "Failed to verify access token",
        err as Error
      );
    }
  }

  public static async decodeRefreshToken(token: string) {
    if (!token || typeof token !== "string")
      throw new ValidationError("Refresh token is required");
    if (!process.env.JWT_REFRESH_SECRET)
      throw new InternalServerError(
        "JWT_REFRESH_SECRET not set in environment variables"
      );

    try {
      return JWT.verify(token, process.env.JWT_REFRESH_SECRET) as JwtUser;
    } catch (err) {
      if (err instanceof JWT.JsonWebTokenError)
        throw new AuthenticationError("Invalid refresh token");
      if (err instanceof JWT.TokenExpiredError)
        throw new AuthenticationError("Refresh token has expired");
      throw new InternalServerError(
        "Failed to verify refresh token",
        err as Error
      );
    }
  }

  private static attachCookiesToResponse(
    res: Response,
    accessToken: string,
    refreshToken: string
  ) {
    try {
      res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        domain: process.env.COOKIE_DOMAIN,
        sameSite: "lax",
        path: "/",
        maxAge: accessTokenEpirationTimeInMinutes * 60 * 1000,
      });

      res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        domain: process.env.COOKIE_DOMAIN,
        sameSite: "lax",
        path: "/",
        maxAge: refreshTokenExpirationTimeInDays * 24 * 60 * 60 * 1000,
      });
    } catch (err) {
      throw new InternalServerError("Failed to set auth cookies", err as Error);
    }
  }

  private static deleteCookiesFromResponse(res: Response) {
    try {
      res.clearCookie(ACCESS_TOKEN_COOKIE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        domain: process.env.COOKIE_DOMAIN,
        sameSite: "lax",
        path: "/",
      });

      res.clearCookie(REFRESH_TOKEN_COOKIE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        domain: process.env.COOKIE_DOMAIN,
        sameSite: "lax",
        path: "/",
      });
    } catch (err) {
      throw new InternalServerError(
        "Failed to delete auth cookies",
        err as Error
      );
    }
  }

  private static validateSignInInput(payload: signInInput) {
    if (!payload) throw new ValidationError("Sign in payload is required");
    if (!payload.user && !payload.googleToken)
      throw new ValidationError(
        "Either user credentials or google token must be provided"
      );

    if (payload.user) {
      if (!payload.user.email || typeof payload.user.email !== "string")
        throw new ValidationError("Valid email is required", "email");
      if (!payload.user.password || typeof payload.user.password !== "string")
        throw new ValidationError("Valid password is required", "password");
    }
    if (payload.googleToken && typeof payload.googleToken !== "string") {
      console.log("error condition matched");
      throw new ValidationError("Invalid google token", "google token");
    }
  }

  // ---------------------------------------------------------------------------------------------

  // Service functions

  public static async setAuthCookies(res: Response, payload: signInInput) {
    // Validating input
    AuthService.validateSignInInput(payload);
    if (!res) throw new InternalServerError("Response object is required");

    let user;
    try {
      if (payload.googleToken)
        user = await UserService.signInWithGoogle(payload.googleToken);
      if (payload.user)
        user = await UserService.signInWithEmailAndPassword(payload.user);
      if (!user) throw new NotFoundError("User not found", "user");

      const accessToken = await AuthService.generateAccessToken(user);
      const refreshToken = await AuthService.generateRefreshToken(user);
      AuthService.attachCookiesToResponse(res, accessToken, refreshToken);
      return true;
    } catch (err) {
      throw err;
    }
  }

  public static async verifyRefreshToken(res: Response, refreshToken: string) {
    if (!res) throw new InternalServerError("Response object is required");

    try {
      const user = await AuthService.decodeRefreshToken(refreshToken);
      if (!user) throw new AuthenticationError("Invalid refresh token");

      const accessToken = await AuthService.generateAccessToken(user);
      const newRefreshToken = await AuthService.generateRefreshToken(user);
      AuthService.attachCookiesToResponse(res, accessToken, newRefreshToken);
      return true;
    } catch (err) {
      throw err;
    }
  }

  public static async deleteAuthCookies(res: Response) {
    if (!res) throw new InternalServerError("Response object is required");
    try {
      AuthService.deleteCookiesFromResponse(res);
      return true;
    } catch (err) {
      throw err;
    }
  }
}
