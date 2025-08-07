export const queries = `#graphql
    getCustomUserToken(googleToken: String, user: SignInFormInput): String!
    verifyRefreshToken(refreshToken: String!): Boolean!
`;
