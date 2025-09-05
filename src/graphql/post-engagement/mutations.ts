export const mutations = `#graphql
    likePost(postId: String!): Boolean
    dislikePost(postId: String!): Boolean

    createComment(postId: String!, content: String!): Boolean!
    deleteComment(postId: String!, commentId: String!): Boolean!
    updateComment(commentId: String!, content: String!): Boolean!
    likeComment(commentId: String!): Boolean!
    dislikeComment(commentId: String!): Boolean!
    createReply(postId: String!, commentId: String!, content: String!): Boolean!

    createBookmark(postId: String!): Boolean!
    removeBookmark(postId: String!): Boolean!
`;
