export const queries = `#graphql
    setAuthCookies(googleToken: String, user: SignInFormInput): Boolean!
    verifyRefreshToken: Boolean!
    deleteAuthCookies: Boolean!
`;
