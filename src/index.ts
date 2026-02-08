import http from "http";
import initExpressApp from "./servers/express";
import initSocketServer from "./servers/socket";
import { logger } from "./observability";

async function startServer() {
  const app = await initExpressApp();
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  const PORT = process.env.PORT || 8000;
  httpServer.listen(PORT, () =>
    logger.info("Server started successfully", {
      port: PORT,
      environment: process.env.NODE_ENV || "development",
    }),
  );
}

startServer();
