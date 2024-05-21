export const typeDefs = `#graphql
    type TweetEngagement {
        tweet: Tweet
        likes: [User]
        comments: [Comment]
        shares: Int

        likesCount: Int
        isTweetLikedBySessionUser: Boolean
        commentsCount: Int
    }

    type Comment {
        id: ID!
        content: String!
        createdAt: String!
        updatedAt: String!

        author: User
        likesCount: Int
        isCommentLikedBySessionUser: Boolean
        
        parentComment: Comment
        commentsCount: Int
        repliedTo: Comment
    }
`;
