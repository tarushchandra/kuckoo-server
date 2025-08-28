import { httpServerType, SocketService } from "../services/socket";

function initSocketServer(httpServer: httpServerType) {
  const socketServer = new SocketService(httpServer);
  socketServer.initialize();
}

export default initSocketServer;
