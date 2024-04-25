export const typeDefs = `#graphql
    type User {
        id: ID!
        firstName: String!
        lastName: String
        email: String!
        username: String!
        profileImageURL: String

        followers: [User]
        followings: [User]
        followersCount: Int
        followingsCount: Int
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
