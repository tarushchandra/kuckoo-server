import { ApolloServer } from "@apollo/server";
import { JwtUser } from "../services/user";
import { User } from "./user";
import { Tweet } from "./tweet";
import { TweetEngagement } from "./tweet-engagement";
import { Notification } from "./notification";
import { Chat } from "./chat";

export interface GraphqlContext {
  user?: JwtUser;
}

async function createApolloGraphQLServer() {
  const gqlServer = new ApolloServer<GraphqlContext>({
    typeDefs: `
        ${User.typeDefs}
        ${Tweet.typeDefs}
        ${TweetEngagement.typeDefs}
        ${Notification.typeDefs}
        ${Chat.typeDefs}

        type Query {
          ${User.queries}
          ${Tweet.queries}
          ${TweetEngagement.queries}
          ${Notification.queries}
          ${Chat.queries}
        }

        type Mutation {
          ${User.mutations}
          ${Tweet.mutations}
          ${TweetEngagement.mutations}
          ${Notification.mutations}
          ${Chat.mutations}
        }
    `,
    resolvers: {
      Query: {
        ...User.resolvers.queries,
        ...Tweet.resolvers.queries,
        ...TweetEngagement.resolvers.queries,
        ...Notification.resolvers.queries,
        ...Chat.resolvers.queries,
      },
      Mutation: {
        ...User.resolvers.mutations,
        ...Tweet.resolvers.mutations,
        ...TweetEngagement.resolvers.mutations,
        ...Notification.resolvers.mutations,
        ...Chat.resolvers.mutations,
      },
      ...User.resolvers.extraResolvers,
      ...Tweet.resolvers.extraResolvers,
      ...TweetEngagement.resolvers.extraResolvers,
      ...Notification.resolvers.extraResolvers,
      ...Chat.resolvers.extraResolvers,
    },
  });

  await gqlServer.start();
  return gqlServer;
}

export default createApolloGraphQLServer;
