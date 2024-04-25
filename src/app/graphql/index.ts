import { ApolloServer } from "@apollo/server";
import { JwtUser } from "../services/user";
import { User } from "./user";
import { Tweet } from "./tweet";

export interface GraphqlContext {
  user?: JwtUser;
}

async function createApolloGraphQLServer() {
  const gqlServer = new ApolloServer<GraphqlContext>({
    typeDefs: `
        ${User.typeDefs}
        ${Tweet.typeDefs}

        type Query {
            ${User.queries}
            ${Tweet.queries}
        }

        type Mutation {
            ${User.mutations}
            ${Tweet.mutations}
        }
    `,
    resolvers: {
      Query: {
        ...User.resolvers.queries,
        ...Tweet.resolvers.queries,
      },
      Mutation: {
        ...User.resolvers.mutations,
        ...Tweet.resolvers.mutations,
      },
      ...User.resolvers.extraResolvers,
      ...Tweet.resolvers.extraResolvers,
    },
  });

  await gqlServer.start();
  return gqlServer;
}

export default createApolloGraphQLServer;
