import { AuthService } from "../express/services/auth";
import { Request, Response } from "express";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export const handleAuthMiddleware = async (req: Request, res: Response) => {
  const accessToken = req.cookies[ACCESS_TOKEN_COOKIE];
  const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE];

  console.log("access_token -", accessToken);
  console.log("refresh_token -", refreshToken);

  if (!accessToken) return { user: null, req, res };

  try {
    const user = await AuthService.decodeAccessToken(accessToken);
    return { user, req, res };
  } catch (err) {
    throw err;
  }
};
