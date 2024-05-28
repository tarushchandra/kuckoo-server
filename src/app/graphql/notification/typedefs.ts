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
        LIKE_ON_TWEET
        COMMENT_ON_TWEET
        LIKE_ON_COMMENT
        REPLY_ON_COMMENT
        FOLLOW
    }

    type Notifications {
        unseenNotifications: [Notification]!
        seenNotifications: [Notification]!
    }

    type MetaData {
        tweet: Tweet
        comment: Comment
        repliedComment: Comment
    }
`;
