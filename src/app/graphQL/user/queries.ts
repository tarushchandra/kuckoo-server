export const queries = `#graphql
    getCustomUserToken(googleToken: String, user: SignInFormInput): String
    getSessionUser: User
    getUser(username: String): User
    getAllUsers: [User]
    getRecommendedUsers: [User]
    isUsernameExist(username: String!): Boolean 
    isEmailExist(email: String!): Boolean 
`;
