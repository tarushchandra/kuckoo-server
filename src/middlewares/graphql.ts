import { expressMiddleware } from "@apollo/server/express4";
import { handleAuthMiddleware } from "./auth";
import { Request, Response, NextFunction } from "express";
import createApolloGraphQLServer from "../graphql";

export const handleGraphqlMiddleware = async () => {
  const graphqlServer = await createApolloGraphQLServer();
  const apolloMiddleware = expressMiddleware(graphqlServer, {
    context: async ({ req, res }) => handleAuthMiddleware(req, res),
  });

  // Typed wrapper middleware
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send.bind(res);
    res.send = (body: any): Response => {
      setStatusCodeFromGraphQLErrors(res, body);
      return originalSend(body);
    };
    return apolloMiddleware(req, res, next);
  };
};

// set express status code for the response
function setStatusCodeFromGraphQLErrors(res: Response, body: any): void {
  try {
    const data = typeof body === "string" ? JSON.parse(body) : body;
    const firstError = data?.errors?.[0];
    if (firstError) {
      const statusCode = firstError.extensions?.statusCode || 500;
      res.status(statusCode);
    }
  } catch {
    // Ignore parse errors
  }
}
