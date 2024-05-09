export const typeDefs = `#graphql
    type TweetEngagement {
        tweet: Tweet
        likedBy: [User]
        shares: Int

        likesCount: Int
        isTweetLikedBySessionUser: Boolean
    }
`;
