export const queries = `#graphql
    getTweet(tweetId: String!): Tweet
    getAllTweets: [Tweet]
    getSignedURLForUploadingImage(payload: imageUploadInput!): String!
    getTweetsFeed: [Tweet]
`;
