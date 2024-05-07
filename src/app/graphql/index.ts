import { ApolloServer } from "@apollo/server";
import { JwtUser } from "../services/user";
import { User } from "./user";
import { Tweet } from "./tweet";
import { TweetEngagement } from "./tweet-engagement";

export interface GraphqlContext {
  user?: JwtUser;
}

async function createApolloGraphQLServer() {
  const gqlServer = new ApolloServer<GraphqlContext>({
    typeDefs: `
        ${User.typeDefs}
        ${Tweet.typeDefs}
        ${TweetEngagement.typeDefs}

        type Query {
          ${User.queries}
          ${Tweet.queries}
          ${TweetEngagement.queries}
        }

        type Mutation {
          ${User.mutations}
          ${Tweet.mutations}
          ${TweetEngagement.mutations}
        }
    `,
    resolvers: {
      Query: {
        ...User.resolvers.queries,
        ...Tweet.resolvers.queries,
        ...TweetEngagement.resolvers.queries,
      },
      Mutation: {
        ...User.resolvers.mutations,
        ...Tweet.resolvers.mutations,
        ...TweetEngagement.resolvers.mutations,
      },
      ...User.resolvers.extraResolvers,
      ...Tweet.resolvers.extraResolvers,
      ...TweetEngagement.resolvers.extraResolvers,
    },
  });

  await gqlServer.start();
  return gqlServer;
}

export default createApolloGraphQLServer;
