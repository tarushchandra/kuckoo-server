import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { handleGraphqlMiddleware } from "../middlewares/graphql";

async function initExpressApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: "http://localhost:3000", credentials: true }));
  app.use("/graphql", await handleGraphqlMiddleware());

  return app;
}

export default initExpressApp;
