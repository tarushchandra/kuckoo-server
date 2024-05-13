export const mutations = `#graphql
    likeTweet(tweetId: String!): Boolean
    dislikeTweet(tweetId: String!): Boolean
    createComment(tweetId: String!, content: String!): Boolean!
    deleteComment(tweetId: String!, commentId: String!): Boolean!
    updateComment(commentId: String!, content: String!): Boolean!
`;
