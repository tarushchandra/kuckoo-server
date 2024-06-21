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

    enum ChatActivityType {
        MEMBER_ADDED,
        MEMBER_REMOVED,
        MADE_ADMIN
    }

    type ChatActivity {
        id: ID!
        type: ChatActivityType
        chat: Chat
        user: User
        targetUser: User
        createdAt: String
    }

    type Message {
        id: ID
        content: String
        sender: User
        createdAt: String
    }

    type ChatHistory {
        date: String!
        messages: [Message]
        activities: [ChatActivity]
    }

    

    input CreateMessagePayload {
        targetUserIds: [String]
        content: String!
        chatId: String
    }
`;
