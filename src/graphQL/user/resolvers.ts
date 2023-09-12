import UserService from "../../services/user";

const queries = {
  getCustomUserToken: (_: any, { googleToken }: { googleToken: String }) => {
    return UserService.getCustomUserToken(googleToken);
  },
};

const mutations = {};

export const resolvers = { queries, mutations };
