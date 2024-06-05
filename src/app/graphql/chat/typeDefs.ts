export const typeDefs = `#graphql
    type Chat {
        id: ID!
        name: String
        isGroupChat: Boolean
        creator: User
        members: [User]
        createdAt: String
        
        messages: [Message]
        latestMessage: Message
    }

    type Message {
        id: ID
        content: String
        sender: User
        createdAt: String
    }

    type GroupedMessages {
        date: String!
        messages: [Message]!
    }

    input CreateMessagePayload {
        targetUserIds: [String]!
        content: String!
        chatId: String
    }
`;
