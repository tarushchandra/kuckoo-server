export const queries = `#graphql
    getPostEngagement(postId: String!): PostEngagement
    getMutualLikers(postId: String!): [User]

    getCommentsOfComment(commentId: String!): [Comment]
    getComment(commentId: String!, postId: String!): Comment
    
    getBookmarks: [Post]
`;
