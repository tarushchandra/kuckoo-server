export const queries = `#graphql
    getChats: [Chat]
    getChat(targetUserId: String!): Chat
    getChatHistory(chatId: String!): [ChatHistory]
    getChatMembers(chatId: String!): [ChatMembership]!
    getAvailableMembers(chatId: String!, searchText: String!): [User]!
    getUnseenChatsCount: Int!
    getPeopleWithMessageSeen(messageId: String!): [User]!
`;
