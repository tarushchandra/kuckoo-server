export const mutations = `#graphql
    createMessage(payload:CreateMessagePayload!): Boolean!
    createGroup(name: String!, targetUserIds: [String]!): Boolean!
    addUsersToGroup(chatId: String!, targetUserIds: [String]!): Boolean!
`;
