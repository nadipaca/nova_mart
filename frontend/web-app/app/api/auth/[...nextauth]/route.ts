import NextAuth, { type NextAuthOptions } from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";

const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID as string;
const COGNITO_ISSUER = process.env.COGNITO_ISSUER as string;

export const authOptions: NextAuthOptions = {
  providers: [
    CognitoProvider({
      clientId: COGNITO_CLIENT_ID,
      clientSecret: "", // public client
      issuer: COGNITO_ISSUER,
      checks: ["pkce"],
      client: {
        token_endpoint_auth_method: "none"
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) token.accessToken = account.access_token;
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
