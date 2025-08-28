export const typeDefs = `#graphql
    type PostEngagement {
        post: Post
        likes: [User]
        comments: [Comment]
        shares: Int

        likesCount: Int
        isPostLikedBySessionUser: Boolean
        commentsCount: Int
        isPostBookmarkedBySessionUser: Boolean
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
