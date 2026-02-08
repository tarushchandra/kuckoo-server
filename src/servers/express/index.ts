import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { handleGraphqlMiddleware } from "../../middlewares/graphql";
import { handleObservabilityMiddleware } from "../../middlewares/observability";

async function initExpressApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: process.env.FRONTEND_SERVER_URL, credentials: true }));
  app.use(handleObservabilityMiddleware);
  app.use("/graphql", await handleGraphqlMiddleware());

  return app;
}

export default initExpressApp;
