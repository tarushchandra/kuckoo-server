import { ApolloServer } from "@apollo/server";
import { User } from "./user";
import { Tweet } from "./tweet";
import { TweetEngagement } from "./tweet-engagement";
import { Notification } from "./notification";
import { Chat } from "./chat";
import { Auth } from "./auth";
import { JwtUser } from "../services/auth";

export interface GraphqlContext {
  user?: JwtUser;
}

async function createApolloGraphQLServer() {
  const gqlServer = new ApolloServer<GraphqlContext>({
    typeDefs: `
        ${Auth.typeDefs}
        ${User.typeDefs}
        ${Tweet.typeDefs}
        ${TweetEngagement.typeDefs}
        ${Notification.typeDefs}
        ${Chat.typeDefs}

        type Query {
          ${Auth.queries}
          ${User.queries}
          ${Tweet.queries}
          ${TweetEngagement.queries}
          ${Notification.queries}
          ${Chat.queries}
        }

        type Mutation {
          ${Auth.mutations}
          ${User.mutations}
          ${Tweet.mutations}
          ${TweetEngagement.mutations}
          ${Notification.mutations}
          ${Chat.mutations}
        }
    `,
    resolvers: {
      Query: {
        ...Auth.resolvers.queries,
        ...User.resolvers.queries,
        ...Tweet.resolvers.queries,
        ...TweetEngagement.resolvers.queries,
        ...Notification.resolvers.queries,
        ...Chat.resolvers.queries,
      },
      Mutation: {
        ...Auth.resolvers.mutations,
        ...User.resolvers.mutations,
        ...Tweet.resolvers.mutations,
        ...TweetEngagement.resolvers.mutations,
        ...Notification.resolvers.mutations,
        ...Chat.resolvers.mutations,
      },
      ...Auth.resolvers.extraResolvers,
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
