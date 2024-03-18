export const queries = `#graphql
    getCustomUserToken(googleToken: String, user: SignInFormInput): String
    getSessionUser: User
    getUser(username: String): User
    getAllUsers: [User]
    isUsernameExist(username: String!): Boolean 
    isEmailExist(email: String!): Boolean 
`;
