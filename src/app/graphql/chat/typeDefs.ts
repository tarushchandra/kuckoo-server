export const typeDefs = `#graphql
    type Chat {
        id: ID!
        name: String
        isGroupChat: Boolean
        creator: User
        createdAt: String
        
        totalMembersCount: Int
        members: [User]
        messages: [Message]
        latestMessage: Message
    }

    enum ChatMemberRole {
        ADMIN,
        MEMBER
    }

    type ChatMembership {
        chat: Chat
        user: User
        role: ChatMemberRole
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
