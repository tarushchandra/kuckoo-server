import express from "express";
import { expressMiddleware } from "@apollo/server/express4";
import createApolloGraphQLServer from "./graphQL/index";
import cors from "cors";

// Service Layers
import UserService from "./services/user";

async function initApp() {
  const app = express();

  app.use(express.json());
  app.use(cors());
  app.use(
    "/graphql",
    expressMiddleware(await createApolloGraphQLServer(), {
      context: async ({ req }) => {
        const authHeader = req.headers["authorization"];
        const token = authHeader?.split(" ")[1];
        return {
          user: token ? await UserService.decodeJwtToken(token) : null,
        };
      },
    })
  );

  return app;
}

export default initApp;
