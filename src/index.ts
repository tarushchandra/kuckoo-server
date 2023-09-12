import express from "express";
import { expressMiddleware } from "@apollo/server/express4";
import createApolloGraphQLServer from "./graphQL";
import cors from "cors";

async function init() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8000;

  app.use(express.json());
  app.use(cors());
  app.use("/graphql", expressMiddleware(await createApolloGraphQLServer()));

  app.listen(PORT, () => console.log(`Server started at: ${PORT}`));
}

init();
