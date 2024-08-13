import initExpressApp from "./express";
import http from "http";
import initSocketServer from "./socket";

async function startServer() {
  const app = await initExpressApp();
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  const PORT = Number(process.env.PORT) || 8000;
  httpServer.listen(PORT, () => console.log(`Server started at PORT: ${PORT}`));
}

startServer();
