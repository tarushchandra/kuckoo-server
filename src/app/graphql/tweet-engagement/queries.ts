export const queries = `#graphql
    getTweetEngagement(tweetId: String!): TweetEngagement
    getMutualLikers(tweetId: String!): [User]

    getCommentsOfComment(commentId: String!): [Comment]
    getComment(commentId: String!, tweetId: String!): Comment
    
    getBookmarks: [Tweet]
`;
