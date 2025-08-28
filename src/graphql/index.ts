import { ApolloServer } from "@apollo/server";
import { User } from "./user";
import { Post } from "./post";
import { PostEngagement } from "./post-engagement";
import { Notification } from "./notification";
import { Chat } from "./chat";
import { Auth } from "./auth";
import { GraphQLFormattedError } from "graphql";
import { Response } from "express";
import { JwtUser } from "../services/auth";
import { ERROR_CODES } from "../express/utils/error";

export interface GraphqlContext {
  user?: JwtUser | null;
  refreshToken?: string;
  res: Response;
}

const graphqlErrorFormatter = (error: GraphQLFormattedError) => {
  return {
    message: error.message || "Internal server error",
    extensions: {
      code: error.extensions?.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
      statusCode: error.extensions?.statusCode || 500,
    },
  };
};

async function createApolloGraphQLServer() {
  const gqlServer = new ApolloServer<GraphqlContext>({
    typeDefs: `
        ${Auth.typeDefs}
        ${User.typeDefs}
        ${Post.typeDefs}
        ${PostEngagement.typeDefs}
        ${Notification.typeDefs}
        ${Chat.typeDefs}

        type Query {
          ${Auth.queries}
          ${User.queries}
          ${Post.queries}
          ${PostEngagement.queries}
          ${Notification.queries}
          ${Chat.queries}
        }

        type Mutation {
          ${Auth.mutations}
          ${User.mutations}
          ${Post.mutations}
          ${PostEngagement.mutations}
          ${Notification.mutations}
          ${Chat.mutations}
        }
    `,
    resolvers: {
      Query: {
        ...Auth.resolvers.queries,
        ...User.resolvers.queries,
        ...Post.resolvers.queries,
        ...PostEngagement.resolvers.queries,
        ...Notification.resolvers.queries,
        ...Chat.resolvers.queries,
      },
      Mutation: {
        ...Auth.resolvers.mutations,
        ...User.resolvers.mutations,
        ...Post.resolvers.mutations,
        ...PostEngagement.resolvers.mutations,
        ...Notification.resolvers.mutations,
        ...Chat.resolvers.mutations,
      },
      ...Auth.resolvers.extraResolvers,
      ...User.resolvers.extraResolvers,
      ...Post.resolvers.extraResolvers,
      ...PostEngagement.resolvers.extraResolvers,
      ...Notification.resolvers.extraResolvers,
      ...Chat.resolvers.extraResolvers,
    },
    formatError: graphqlErrorFormatter,
  });

  await gqlServer.start();
  return gqlServer;
}

export default createApolloGraphQLServer;
