import { SocketService } from "../../services/socket";
import { httpServerType } from "./types";

function initSocketServer(httpServer: httpServerType) {
  const socketServer = new SocketService(httpServer);
  socketServer.initialize();
}

export default initSocketServer;
