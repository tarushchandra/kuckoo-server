import { ApolloServer } from "@apollo/server";
import { User } from "./user";
import { JwtUser } from "../services/user";

export interface GraphqlContext {
  user?: JwtUser;
}

async function createApolloGraphQLServer() {
  const gqlServer = new ApolloServer<GraphqlContext>({
    typeDefs: `
        ${User.typeDefs}

        type Query {
            ${User.queries}
        }

        type Mutation {
            ${User.mutations}
        }
    `,
    resolvers: {
      Query: {
        ...User.resolvers.queries,
      },
      Mutation: {
        ...User.resolvers.mutations,
      },
      ...User.resolvers.extraResolvers,
    },
  });

  await gqlServer.start();
  return gqlServer;
}

export default createApolloGraphQLServer;
