export const mutations = `#graphql
    createMessage(payload:CreateMessagePayload!): Message
    createGroup(name: String!, targetUserIds: [String]!): Boolean!
    renameGroup(chatId: String!, name: String!): Boolean!
    addMembersToGroup(chatId: String!, targetUserIds: [String]!): Boolean!
    removeMemberFromGroup(chatId: String!, targetUserId: String!): Boolean!
    makeGroupAdmin(chatId: String!, targetUserId: String!): Boolean!
    removeGroupAdmin(chatId: String!, targetUserId: String!): Boolean!
    leaveGroup(chatId: String!): Boolean!
    seenBy(chatId: String!, messageIds: [String]!): Boolean!
`;
