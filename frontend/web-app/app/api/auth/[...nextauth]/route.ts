import NextAuth, { type NextAuthOptions } from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";

const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID as string;
const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET as string;
const COGNITO_ISSUER = process.env.COGNITO_ISSUER as string;

export const authOptions: NextAuthOptions = {
  providers: [
    CognitoProvider({
      clientId: COGNITO_CLIENT_ID,
      clientSecret: COGNITO_CLIENT_SECRET,
      issuer: COGNITO_ISSUER,
    })
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
      }
      if (profile) {
        token.email = profile.email;
        token.sub = profile.sub;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).idToken = token.idToken;
      if (session.user && token.email) {
        session.user.email = token.email as string;
        (session.user as any).sub = token.sub;
      }
      return session;
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };