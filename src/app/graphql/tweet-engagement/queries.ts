export const queries = `#graphql
    getTweetEngagement(tweetId: String!): TweetEngagement
    getMutualLikers(tweetId: String!): [User]
`;
