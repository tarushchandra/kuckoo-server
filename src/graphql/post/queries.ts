export const queries = `#graphql
    getPost(postId: String!): Post
    getPaginatedPosts(userId: String!, limit: Int!, cursor: String): PaginatedPosts!
    getAllPosts: [Post]
    getSignedURLForUploadingImage(payload: imageUploadInput!): String!
    getPaginatedPostsFeed(limit: Int!, cursor: String): PaginatedPosts!
`;
