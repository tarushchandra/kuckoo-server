export const mutations = `#graphql
    createTweet(payload: TweetInput!): Boolean!
    deleteTweet(tweetId: ID!): Boolean!
    updateTweet(tweetId: ID!, content: String!): Boolean!
`;
