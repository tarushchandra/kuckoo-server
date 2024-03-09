export const typeDefs = `#graphql
    type User {
        id: ID!
        firstName: String!
        lastName: String
        email: String!
        username: String!
        profileImageURL: String
    }

    input SignInFormInput {
        email: String!
        password: String!
    }

    input SignUpFormInput {
        firstName: String!
        lastName: String
        email: String!
        username: String!
        password: String!
    }
`;
