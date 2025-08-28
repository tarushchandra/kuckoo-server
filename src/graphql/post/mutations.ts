export const mutations = `#graphql
    createPost(payload: PostInput!): Boolean!
    deletePost(postId: ID!): Boolean!
    updatePost(postId: ID!, payload: PostInput!): Boolean!
`;
