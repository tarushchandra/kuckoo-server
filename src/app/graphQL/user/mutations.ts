export const mutations = `#graphql
    createUserWithEmailAndPassword(user: SignUpFormInput!): Boolean
    followUser(to: ID!): Boolean
    unfollowUser(to: ID!): Boolean
    removeFollower(userId: ID!): Boolean
`;
