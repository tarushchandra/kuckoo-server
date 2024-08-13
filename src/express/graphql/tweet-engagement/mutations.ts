export const mutations = `#graphql
    likeTweet(tweetId: String!): Boolean
    dislikeTweet(tweetId: String!): Boolean

    createComment(tweetId: String!, content: String!): Boolean!
    deleteComment(tweetId: String!, commentId: String!): Boolean!
    updateComment(commentId: String!, content: String!): Boolean!
    likeComment(commentId: String!): Boolean!
    dislikeComment(commentId: String!): Boolean!
    createReply(tweetId: String!, commentId: String!, content: String!): Boolean!

    createBookmark(tweetId: String!): Boolean!
    removeBookmark(tweetId: String!): Boolean!
`;
