export const mutations = `#graphql
    createMessage(payload:CreateMessagePayload!): Chat
    createGroup(name: String!, targetUserIds: [String]!): Boolean!
    addMembersToGroup(chatId: String!, targetUserIds: [String]!): Boolean!
    renameGroup(chatId: String!, name: String!): Boolean!
`;
