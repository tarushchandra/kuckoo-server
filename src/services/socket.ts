import { WebSocketServer, WebSocket } from "ws";
import UserService from "./user";
import { ChatService } from "./chat";
import { prismaClient } from "../clients/prisma";
import { redisClient } from "../clients/redis";
import {
  httpServerType,
  OnlineUser,
  SOCKET_MESSAGE,
  SocketMaps,
} from "../servers/socket/types";

export class SocketService {
  private wss: WebSocketServer;
  private socketMessageHandler: SocketMessageHandlerService;

  constructor(httpServer: httpServerType) {
    this.wss = new WebSocketServer({ server: httpServer });
    this.socketMessageHandler = new SocketMessageHandlerService();
  }

  public initialize() {
    this.wss.on("connection", (socket: WebSocket) => {
      this.setupSocketListeners(socket);
    });
  }

  private setupSocketListeners(socket: WebSocket) {
    socket.on("message", (data) => this.handleMessage(socket, data));
    socket.on("close", () => this.handleConnectionClosed(socket));
    socket.on("error", (err) => this.handleError(err));
  }

  private async handleMessage(socket: WebSocket, data: any) {
    const message = JSON.parse(data.toString("utf-8"));

    if (message.type === SOCKET_MESSAGE.CONNECTION_ESTABLISHED)
      this.socketMessageHandler.handleConnectionEstablished(socket, message);

    if (message.type === SOCKET_MESSAGE.CHAT_MESSAGE)
      this.socketMessageHandler.handleChatMessage(socket, message);

    if (message.type === SOCKET_MESSAGE.CHAT_MESSAGES_ARE_SEEN_BY_THE_RECIPIENT)
      this.socketMessageHandler.handleChatMessagesAreSeenByTheRecipient(
        message
      );

    if (message.type === SOCKET_MESSAGE.USER_IS_TYPING)
      this.socketMessageHandler.handleUserIsTyping(socket, message);

    if (message.type === SOCKET_MESSAGE.IS_USER_ONLINE)
      this.socketMessageHandler.handleIsUserOnline(socket, message);
  }

  private async handleConnectionClosed(socket: WebSocket) {
    this.socketMessageHandler.handleConnectionClosed(socket);
  }

  private handleError(error: Error) {
    console.log("Socket error:", error);
  }
}

// -----------------------------------------------------------------------------------------------------

class SocketMessageHandlerService {
  private maps: SocketMaps;

  constructor() {
    this.maps = {
      roomToOnlineUsers: new Map<string, OnlineUser[]>(),
      socketToRooms: new Map<WebSocket, string[]>(),
      userIdToSocket: new Map<string, WebSocket>(),
      socketToUserId: new Map<WebSocket, string>(),
    };
  }

  public async handleConnectionClosed(socket: WebSocket) {
    const targetUserId = this.maps.socketToUserId.get(socket);

    // sending the current user's offline status to other online users
    const uniqueOnlineUsers = new Set<string>();
    const lastSeenAt = Date.now();

    this.maps.socketToRooms.get(socket)?.forEach((roomId) => {
      const room = this.maps.roomToOnlineUsers.get(roomId);
      if (!room) return;

      const userIndex = room.findIndex(
        (onlineUser) => onlineUser.socket === socket
      );

      if (userIndex !== -1) {
        room.splice(userIndex, 1);

        room.forEach((onlineUser) => {
          if (!uniqueOnlineUsers.has(onlineUser.userId)) {
            uniqueOnlineUsers.add(onlineUser.userId);

            if (onlineUser.socket.readyState === WebSocket.OPEN) {
              onlineUser.socket.send(
                JSON.stringify({
                  type: SOCKET_MESSAGE.USER_IS_OFFLINE,
                  userId: targetUserId,
                  lastSeenAt,
                })
              );
            }
          }
        });

        // check if the room is empty and remove it
        if (room.length === 0) this.maps.roomToOnlineUsers.delete(roomId);
      }
    });

    if (targetUserId) {
      await UserService.setLastSeenAt(targetUserId, lastSeenAt);
      this.maps.userIdToSocket.delete(targetUserId);
    }
    this.maps.socketToUserId.delete(socket);
    this.maps.socketToRooms.delete(socket);
  }

  public async handleConnectionEstablished(socket: WebSocket, message: any) {
    const userId = message.userId;
    const chats = await prismaClient.chat.findMany({
      where: { members: { some: { userId } } },
      include: { members: { where: { userId: { not: userId } } } },
    });

    // sending the current user's online status to other online users
    const uniqueOnlineUsers = new Set();
    chats.forEach((chat) => {
      if (this.maps.roomToOnlineUsers.size === 0) return;

      this.maps.roomToOnlineUsers.get(chat.id)?.forEach((onlineUser) => {
        if (!uniqueOnlineUsers.has(onlineUser.userId)) {
          uniqueOnlineUsers.add(onlineUser.userId);

          if (
            onlineUser.socket.readyState === WebSocket.OPEN &&
            onlineUser.socket !== socket
          ) {
            onlineUser.socket.send(
              JSON.stringify({
                type: SOCKET_MESSAGE.USER_IS_ONLINE,
                userId: userId,
              } as any)
            );
            socket.send(
              JSON.stringify({
                type: SOCKET_MESSAGE.USER_IS_ONLINE,
                userId: onlineUser.userId,
              })
            );
          }
        }
      });
    });

    // setting current user as online in one of the active rooms
    chats.forEach((chat) => {
      if (!this.maps.roomToOnlineUsers.has(chat.id))
        this.maps.roomToOnlineUsers.set(chat.id, []);
      if (!this.maps.socketToRooms.has(socket))
        this.maps.socketToRooms.set(socket, []);

      this.maps.roomToOnlineUsers
        .get(chat.id)
        ?.push({ userId: userId, socket });
      this.maps.socketToRooms.get(socket)?.push(chat.id);
    });

    // setting the (userId -> socket && socket -> userId) map for quick retreival
    this.maps.userIdToSocket.set(userId, socket);
    this.maps.socketToUserId.set(socket, userId);
  }

  public async handleChatMessage(socket: WebSocket, message: any) {
    // sending an acknowledegement of "MESSAGE_RECIEVED_BY_SERVER" back to the sender
    socket.send(
      JSON.stringify({
        type: SOCKET_MESSAGE.CHAT_MESSAGE_IS_RECIEVED_BY_THE_SERVER,
        chatId: message.chatId,
        messageId: message.message.id,
      })
    );

    // initializing chatId
    let chatId = message.chatId;
    let messagesWithTempAndActualIds: any[] = [];

    // if the chat is not created
    if (typeof message.chatId === "number") {
      // sending the message ("with temporary message IDs") to whom sender wants to start the chat
      const targetUserSocket = this.maps.userIdToSocket.get(
        message.targetUsers[0].id
      );
      if (targetUserSocket?.readyState === WebSocket.OPEN)
        targetUserSocket.send(JSON.stringify(message));

      // storing the current chat as "processing" in redis state
      const isChatCreated = await redisClient.exists(
        `CHAT_CREATED_WITH_TEMP_ID:${message.chatId}`
      );
      await redisClient.rpush(
        `CHAT_CREATED_WITH_TEMP_ID:${message.chatId}`,
        JSON.stringify(message.message)
      );
      if (isChatCreated) return;

      // creating the chat
      const chat = await ChatService.findOrCreateChat(
        message.message.sender.id,
        message.targetUsers.map((x: any) => x.id)
      );
      chatId = chat.id;

      // storing messages to DB
      const tempMessages = await redisClient.lrange(
        `CHAT_CREATED_WITH_TEMP_ID:${message.chatId}`,
        0,
        -1
      );
      const parsedTempMessages = tempMessages.map((x) => JSON.parse(x));
      const storedMessages: any = await ChatService.createMessages(
        message.message.sender.id,
        chatId,
        parsedTempMessages
      );

      // updating the messagesWithTempAndActualIds
      let temporaryMessagesIndex = 0;
      let actualMessagesIndex = storedMessages.length - 1;
      while (
        temporaryMessagesIndex < parsedTempMessages.length &&
        actualMessagesIndex >= 0
      ) {
        messagesWithTempAndActualIds.unshift({
          temporaryMessageId: parsedTempMessages[temporaryMessagesIndex].id,
          actualMessageId: storedMessages[actualMessagesIndex].id,
          sender: {
            id: message.message.sender.id,
          },
        });
        temporaryMessagesIndex++;
        actualMessagesIndex--;
      }

      // if the newly created chat is immediately seen by the reciepient
      const areChatMessagesSeen = await redisClient.exists(
        `SEEN_MESSAGES:${message.chatId}`
      );
      if (areChatMessagesSeen) {
        const seenChatMessages = await redisClient.lrange(
          `SEEN_MESSAGES:${message.chatId}`,
          0,
          -1
        );
        seenChatMessages.forEach(
          async (x) => await redisClient.rpush(`SEEN_MESSAGES:${chatId}`, x)
        );
        await redisClient.del(`SEEN_MESSAGES:${message.chatId}`);
      }

      // deleting the "temporary chat messages data" from the redis state
      await redisClient.del(`CHAT_CREATED_WITH_TEMP_ID:${message.chatId}`);

      // ------------ updating roomToOnlineUsersMap, socketToRoomsMap -----------------
      const onlineUsers: OnlineUser[] = [];
      if (socket?.readyState === WebSocket.OPEN) {
        onlineUsers.push({
          userId: message.message.sender.id,
          socket,
        });
        // updating socketToRoomsMap for sender
        if (this.maps.socketToRooms.has(socket))
          this.maps.socketToRooms.get(socket)?.push(chatId);
        else this.maps.socketToRooms.set(socket, [chatId]);
      }
      if (targetUserSocket?.readyState === WebSocket.OPEN) {
        onlineUsers.push({
          userId: message.targetUsers[0].id,
          socket: targetUserSocket,
        });
        // updating socketToRoomsMap for target
        if (this.maps.socketToRooms.has(targetUserSocket))
          this.maps.socketToRooms.get(targetUserSocket)?.push(chatId);
        else this.maps.socketToRooms.set(targetUserSocket, [chatId]);
      }

      // updating roomToOnlineUsersMap
      this.maps.roomToOnlineUsers.set(chatId, onlineUsers);

      // console.log("------------ new chat created -----------");
      // console.log("roomToOnlineUsersMap -", roomToOnlineUsersMap);
      // console.log("socketToRoomsMap -", socketToRoomsMap);
    }
    // if the chat is already created
    else {
      // sending the message ("with temporary message IDs") to all connected users except the sender of the message
      this.maps.roomToOnlineUsers.get(message.chatId)?.forEach((onlineUser) => {
        if (
          onlineUser.socket.readyState === WebSocket.OPEN &&
          onlineUser.socket !== socket
        )
          onlineUser.socket.send(JSON.stringify(message));
      });

      // storing message
      const storedMessages: any = await ChatService.createMessages(
        message.message.sender.id,
        chatId,
        [message.message]
      );

      messagesWithTempAndActualIds.push({
        temporaryMessageId: message.message.id,
        actualMessageId: storedMessages[0].id,
        sender: {
          id: message.message.sender.id,
        },
      });
    }

    // ---------------

    console.log("messagesWithTempAndActualIds -", messagesWithTempAndActualIds);

    // sending the "actual message IDs" OR "actual newly created chatId" to all the users
    this.maps.roomToOnlineUsers.get(chatId)?.forEach((onlineUser) => {
      if (onlineUser.socket.readyState === WebSocket.OPEN) {
        onlineUser.socket.send(
          JSON.stringify({
            type: SOCKET_MESSAGE.ACTUAL_CHAT_OR_MESSAGES_IDS,
            ...(typeof message.chatId === "number" && {
              chat: {
                temporaryChatId: message.chatId,
                actualChatId: chatId,
                creator: message.creator,
              },
            }),
            messages: {
              chatId,
              messages: messagesWithTempAndActualIds,
            },
          })
        );
      }
    });

    // setting messages as "seen"
    const isSeenMessages = await redisClient.exists(`SEEN_MESSAGES:${chatId}`);
    if (!isSeenMessages) return;
    const seenMessages = await redisClient.lrange(
      `SEEN_MESSAGES:${chatId}`,
      0,
      -1
    );

    const parsedSeenMessages: any[] = [];
    seenMessages.forEach((x) => {
      const parsedMessage = JSON.parse(x);
      const finalMessage = messagesWithTempAndActualIds.find(
        (y) => y.temporaryMessageId === parsedMessage.message.id
      );
      if (!finalMessage) return;
      parsedMessage.message.id = finalMessage.actualMessageId;
      parsedSeenMessages.push(parsedMessage);
    });

    const seenByIdToMessagesMap = new Map();
    parsedSeenMessages.forEach((x) => {
      if (!seenByIdToMessagesMap.has(x.seenBy.id))
        seenByIdToMessagesMap.set(x.seenBy.id, []);
      seenByIdToMessagesMap.get(x.seenBy.id)?.push(x.message);
    });

    for (const entry of seenByIdToMessagesMap.entries()) {
      const [seenById, messages] = entry;
      await ChatService.setMessagesAsSeen(seenById, chatId, messages);
    }

    await redisClient.del(`SEEN_MESSAGES:${chatId}`);
  }

  public async handleChatMessagesAreSeenByTheRecipient(message: any) {
    const { messages, chatId, seenBy } = message;

    const senderIdToMessagesMap = new Map<string, string[]>();
    let isMessageWithTemporaryIdPresent = false;

    messages.forEach(async (message: any) => {
      if (!senderIdToMessagesMap.has(message.sender.id))
        senderIdToMessagesMap.set(message.sender.id, []);
      senderIdToMessagesMap.get(message.sender.id)?.push(message.content);

      if (typeof message.id === "number") {
        isMessageWithTemporaryIdPresent = true;

        await redisClient.rpush(
          `SEEN_MESSAGES:${chatId}`,
          JSON.stringify({ message: { id: message.id }, seenBy })
        );
      }
    });

    for (const entry of senderIdToMessagesMap.entries()) {
      const [senderId, messages] = entry;
      const senderSocket = this.maps.userIdToSocket.get(senderId);

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

  public handleUserIsTyping(socket: WebSocket, message: any) {
    this.maps.roomToOnlineUsers.get(message.chatId)?.forEach((onlineUser) => {
      if (
        onlineUser.socket.readyState === WebSocket.OPEN &&
        onlineUser.socket !== socket
      )
        onlineUser.socket.send(JSON.stringify(message));
    });
  }

  public async handleIsUserOnline(socket: WebSocket, message: any) {
    const userSocket = this.maps.userIdToSocket.get(message.userId);

    if (userSocket?.readyState !== WebSocket.OPEN) {
      const lastSeenAt = await UserService.getLastSeenAt(message.userId);
      socket.send(JSON.stringify({ ...message, isOnline: false, lastSeenAt }));
    } else
      socket.send(
        JSON.stringify({
          ...message,
          isOnline: true,
        })
      );
  }
}
