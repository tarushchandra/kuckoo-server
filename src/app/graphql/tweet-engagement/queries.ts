export const queries = `#graphql
    getTweetEngagement(tweetId: String!): TweetEngagement
    getLikesCount(tweetId: String!): Int
    isTweetLiked(tweetId: String!): Boolean
    getMutualLikers(tweetId: String!): [User]
`;
