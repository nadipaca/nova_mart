import NextAuth, { type NextAuthOptions } from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[next-auth] Missing required env var ${name}. Check frontend/web-app/.env.local and restart \`npm run dev\`.`
    );
  }
  return value;
}

requiredEnv("NEXTAUTH_URL");
const NEXTAUTH_SECRET = requiredEnv("NEXTAUTH_SECRET");

const COGNITO_CLIENT_ID = requiredEnv("COGNITO_CLIENT_ID");
const COGNITO_CLIENT_SECRET = requiredEnv("COGNITO_CLIENT_SECRET");
const COGNITO_ISSUER = requiredEnv("COGNITO_ISSUER");

const authOptions: NextAuthOptions = {
  secret: NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  providers: [
    CognitoProvider({
      clientId: COGNITO_CLIENT_ID,
      clientSecret: COGNITO_CLIENT_SECRET,
      issuer: COGNITO_ISSUER,
      authorization: { params: { scope: "openid email profile" } },
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
