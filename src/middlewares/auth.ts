import { Request, Response } from "express";
import {
  AuthenticationError,
  AuthorizationError,
} from "../express/utils/error";
import { GraphqlContext } from "../express/graphql";
import {
  ACCESS_TOKEN_COOKIE,
  AuthService,
  REFRESH_TOKEN_COOKIE,
} from "../services/auth";

export const handleAuthMiddleware = async (req: Request, res: Response) => {
  const accessToken = req.cookies[ACCESS_TOKEN_COOKIE];
  const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE];

  if (!accessToken) return { res, user: null, refreshToken };

  try {
    const user = await AuthService.decodeAccessToken(accessToken);
    return { res, user, refreshToken };
  } catch (err) {
    return { res, user: null, refreshToken };
  }
};

// utility functions to check auth status
export function requireAuthenticationAndGetUser(ctx: GraphqlContext) {
  if (!ctx.user || !ctx.user.id) throw new AuthenticationError();
  return ctx.user;
}

export function requireAuthorizationAndGetUser(
  userId: string,
  ctx: GraphqlContext
) {
  const user = requireAuthenticationAndGetUser(ctx);
  if (user.id !== userId) throw new AuthorizationError();
  return user;
}

export function optionalAuth(ctx: GraphqlContext) {
  return ctx.user || null;
}
