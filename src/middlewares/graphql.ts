import { expressMiddleware } from "@apollo/server/express4";
import createApolloGraphQLServer from "../express/graphql";
import { handleAuthMiddleware } from "./auth";

export const handleGraphqlMiddleware = async () => {
  return expressMiddleware(await createApolloGraphQLServer(), {
    context: async ({ req, res }) => handleAuthMiddleware(req, res),
  });
};
