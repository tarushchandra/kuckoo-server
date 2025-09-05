export const typeDefs = `#graphql
    type Post {
        id: ID!
        content: String
        imageURL: String
        createdAt: String!
        updatedAt: String!

        author: User
        postEngagement: PostEngagement
    }

    type PaginatedPosts {
        posts: [Post]!
        nextCursor: String
    }

    input PostInput {
        content: String
        imagePathname: String
    }

    input imageUploadInput {
        imageName: String!
        imageType: String!
    }
`;
