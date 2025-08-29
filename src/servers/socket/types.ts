import http from "http";
import { WebSocket } from "ws";

export type httpServerType = http.Server<
  typeof http.IncomingMessage,
  typeof http.ServerResponse
>;

export enum SOCKET_MESSAGE {
  CONNECTION_ESTABLISHED = "CONNECTION_ESTABLISHED",
  CHAT_MESSAGE = "CHAT_MESSAGE",
  CHAT_MESSAGE_IS_RECIEVED_BY_THE_SERVER = "CHAT_MESSAGE_IS_RECIEVED_BY_THE_SERVER",
  ACTUAL_CHAT_OR_MESSAGES_IDS = "ACTUAL_CHAT_OR_MESSAGES_IDS",
  CHAT_MESSAGES_ARE_SEEN_BY_THE_RECIPIENT = "CHAT_MESSAGES_ARE_SEEN_BY_THE_RECIPIENT",
  USER_IS_TYPING = "USER_IS_TYPING",
  IS_USER_ONLINE = "IS_USER_ONLINE",
  USER_IS_ONLINE = "USER_IS_ONLINE",
  USER_IS_OFFLINE = "USER_IS_OFFLINE",
}

// --------------------------------------------------------------------------------

// online users in different chats
export interface OnlineUser {
  userId: string;
  socket: WebSocket;
}

export interface SocketMaps {
  roomToOnlineUsers: Map<string, OnlineUser[]>;
  socketToRooms: Map<WebSocket, string[]>;
  userIdToSocket: Map<string, WebSocket>;
  socketToUserId: Map<WebSocket, string>;
}
