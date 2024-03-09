export const queries = `#graphql
    getCustomUserToken(googleToken: String, user: SignInFormInput): String
    getCurrentUser: User
    isUsernameExist(username: String!): Boolean 
    isEmailExist(email: String!): Boolean 
`;
