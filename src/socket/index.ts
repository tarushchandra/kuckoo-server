import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import UserService from "../express/services/user";
import { prismaClient } from "../express/clients/prisma";
import { Message } from "@prisma/client";
import { ChatService } from "../express/services/chat";
import { redisClient } from "../express/clients/redis";

// online users in different chats
interface OnlineUser {
  userId: string;
  socket: WebSocket;
}

type httpServerType = http.Server<
  typeof http.IncomingMessage,
  typeof http.ServerResponse
>;

function initSocketServer(httpServer: httpServerType) {
  // following maps for tracking online users
  const rooms = new Map<string, OnlineUser[]>();
  const socketToRoomsMap = new Map<WebSocket, string[]>();
  const userIdToSocketMap = new Map<string, WebSocket>();

  const wss = new WebSocketServer({ server: httpServer });
  wss.on("connection", (socket, req) => {
    console.log("new socket connected");

    socket.on("error", (err) => console.log(err));

    socket.on("close", async () => {
      console.log("socket disconnected");

      // sending the current user's offline status to other online users
      const uniqueOnlineUsers = new Set<string>();
      let disconnectedUser: any = null;
      const lastSeenAt = Date.now();

      socketToRoomsMap.get(socket)?.forEach((roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;

        const userIndex = room.findIndex(
          (onlineUser) => onlineUser.socket === socket
        );

        if (userIndex !== -1) {
          disconnectedUser = room[userIndex];
          room.splice(userIndex, 1);

          room.forEach((onlineUser) => {
            if (!uniqueOnlineUsers.has(onlineUser.userId)) {
              uniqueOnlineUsers.add(onlineUser.userId);

              if (onlineUser.socket.readyState === WebSocket.OPEN) {
                onlineUser.socket.send(
                  JSON.stringify({
                    type: "USER_IS_OFFLINE",
                    userId: disconnectedUser.userId,
                    lastSeenAt,
                  })
                );
              }
            }
          });

          // check if the room is empty and remove it
          if (room.length === 0) rooms.delete(roomId);
        }
      });

      socketToRoomsMap.delete(socket);
      userIdToSocketMap.delete(disconnectedUser.userId);

      await UserService.setLastSeenAt(disconnectedUser.userId, lastSeenAt);

      // console.log("rooms after disconnection -", rooms);
      // console.log("userToRooms after disconnection -", userToRoomsMap);
    });

    socket.on("message", async (data, isBinary) => {
      // console.log("message recieved -", data.toString("utf-8"));
      const message = JSON.parse(data.toString("utf-8"));
      console.log("message recieved -", message);

      if (message.type === "AUTH") {
        const user = await UserService.decodeJwtToken(message.accessToken);
        const chats = await prismaClient.chat.findMany({
          where: { members: { some: { userId: user.id } } },
          include: { members: { where: { userId: { not: user.id } } } },
        });

        // sending the current user's online status to other online users
        const uniqueOnlineUsers = new Set();
        chats.forEach((chat) => {
          if (rooms.size === 0) return;

          rooms.get(chat.id)?.forEach((onlineUser) => {
            if (!uniqueOnlineUsers.has(onlineUser.userId)) {
              uniqueOnlineUsers.add(onlineUser.userId);

              if (
                onlineUser.socket.readyState === WebSocket.OPEN &&
                onlineUser.socket !== socket
              ) {
                onlineUser.socket.send(
                  JSON.stringify({
                    type: "USER_IS_ONLINE",
                    userId: user.id,
                  } as any)
                );
                socket.send(
                  JSON.stringify({
                    type: "USER_IS_ONLINE",
                    userId: onlineUser.userId,
                  })
                );
              }
            }
          });
        });

        // setting current user as online in one of the active rooms
        chats.forEach((chat) => {
          if (!rooms.has(chat.id)) rooms.set(chat.id, []);
          if (!socketToRoomsMap.has(socket)) socketToRoomsMap.set(socket, []);

          rooms.get(chat.id)?.push({ userId: user.id, socket });
          socketToRoomsMap.get(socket)?.push(chat.id);
        });

        // setting the userId -> socket map for quick retreival
        userIdToSocketMap.set(user.id, socket);

        // console.log("rooms after connection -", rooms);
        // console.log("userToRooms after connection -", userToRoomsMap);
      }

      if (message.type === "CHAT_MESSAGE") {
        // sending the message to all connected users except the sender of the message
        rooms.get(message.chatId)?.forEach((onlineUser) => {
          if (
            onlineUser.socket.readyState === WebSocket.OPEN &&
            onlineUser.socket !== socket
          )
            onlineUser.socket.send(JSON.stringify(message));
        });

        // sending an acknowledegement of "MESSAGE_SENT_SUCCESSFULLY" back to the sender
        socket.send(
          JSON.stringify({
            type: "CHAT_MESSAGE_IS_SENT_TO_THE_RECIPIENT",
            chatId: message.chatId,
            messageId: message.message.id,
          })
        );

        // ---------------

        // storing message to DB
        const storedMessage: any = await ChatService.createMessage(
          message.message.sender.id,
          {
            targetUserIds: [],
            content: message.message.content,
            chatId: message.chatId,
          }
        );

        // sending the actual messageId to all the users
        rooms.get(message.chatId)?.forEach((onlineUser) => {
          if (onlineUser.socket.readyState === WebSocket.OPEN)
            onlineUser.socket.send(
              JSON.stringify({
                type: "ACTUAL_MESSAGE_ID",
                chatId: message.chatId,
                temporaryMessageId: message.message.id,
                actualMessageId: storedMessage.id,
                sender: message.message.sender,
              })
            );
        });

        const seenMessage: any = await redisClient.get(
          `MESSAGE_SEEN:${message.chatId}:${message.message.id}`
        );
        const parsedSeenMessage = JSON.parse(seenMessage);

        if (parsedSeenMessage?.isSeen) {
          await ChatService.setMessagesAsSeen(
            parsedSeenMessage?.seenBy.id,
            message.chatId,
            [{ ...message.message, id: storedMessage.id }]
          );

          await redisClient.del(
            `MESSAGE_SEEN:${message.chatId}:${message.message.id}`
          );
        }
      }

      if (message.type === "CHAT_MESSAGES_ARE_SEEN_BY_THE_RECIPIENT") {
        const { messages, chatId, seenBy } = message;

        const senderIdToMessagesMap = new Map<string, string[]>();
        let isMessageWithTemporaryIdPresent = false;

        messages.forEach(async (message: any) => {
          if (!senderIdToMessagesMap.has(message.sender.id))
            senderIdToMessagesMap.set(message.sender.id, []);
          senderIdToMessagesMap.get(message.sender.id)?.push(message.content);

          if (typeof message.id === "number") {
            isMessageWithTemporaryIdPresent = true;
            await redisClient.set(
              `MESSAGE_SEEN:${chatId}:${message.id}`,
              JSON.stringify({ isSeen: true, seenBy })
            );
          }
        });

        for (const entry of senderIdToMessagesMap.entries()) {
          const [senderId, messages] = entry;
          const senderSocket = userIdToSocketMap.get(senderId);

          if (senderSocket?.readyState === WebSocket.OPEN) {
            senderSocket.send(
              JSON.stringify({
                type: message.type,
                chatId,
                messages,
                seenBy,
              })
            );
          }
        }

        if (!isMessageWithTemporaryIdPresent)
          await ChatService.setMessagesAsSeen(seenBy.id, chatId, messages);
      }

      if (message.type === "USER_IS_TYPING") {
        rooms.get(message.chatId)?.forEach((onlineUser) => {
          if (
            onlineUser.socket.readyState === WebSocket.OPEN &&
            onlineUser.socket !== socket
          )
            onlineUser.socket.send(data, { binary: isBinary });
        });
      }
    });
  });
}

export default initSocketServer;
