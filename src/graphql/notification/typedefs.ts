export const typeDefs = `#graphql
    type Notification {
        id: ID!
        type: NotificationType!
        sender: User!
        recipient: User
        isSeen: Boolean
        createdAt: String!

        metaData: MetaData
    }

    enum NotificationType {
        LIKE_ON_POST
        COMMENT_ON_POST
        LIKE_ON_COMMENT
        REPLY_ON_COMMENT
        FOLLOW
    }

    type Notifications {
        unseenNotifications: [Notification]!
        seenNotifications: [Notification]!
    }

    type MetaData {
        post: Post
        comment: Comment
        repliedComment: Comment
    }
`;
