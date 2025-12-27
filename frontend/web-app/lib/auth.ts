import type { NextAuthOptions } from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";
import CredentialsProvider from "next-auth/providers/credentials";
import { loadLocalUsers, verifyPasswordScrypt } from "@/lib/local-users";
import { signJwtHS256 } from "@/lib/jwt";

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

const AUTH_MODE = (
  process.env.AUTH_MODE ??
  process.env.NEXT_PUBLIC_AUTH_MODE ??
  "cognito"
).toLowerCase();

function localJwtConfig() {
  return {
    issuer: process.env.LOCAL_JWT_ISSUER ?? "novamart-local",
    audience: process.env.LOCAL_JWT_AUDIENCE ?? "novamart-api",
    secret: process.env.LOCAL_JWT_SECRET ?? NEXTAUTH_SECRET,
    ttlSeconds: Number(process.env.LOCAL_JWT_TTL_SECONDS ?? "3600"),
  };
}

function cognitoConfig() {
  return {
    clientId: requiredEnv("COGNITO_CLIENT_ID"),
    clientSecret: requiredEnv("COGNITO_CLIENT_SECRET"),
    issuer: requiredEnv("COGNITO_ISSUER"),
  };
}

export const authOptions: NextAuthOptions = {
  secret: NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers:
    AUTH_MODE === "local"
      ? [
          CredentialsProvider({
            name: "Local",
            credentials: {
              email: { label: "Email", type: "text" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              const email = credentials?.email?.trim().toLowerCase();
              const password = credentials?.password ?? "";
              if (!email || !password) return null;

              const users = await loadLocalUsers();
              const user = users.find(
                (candidate) => candidate.email.toLowerCase() === email
              );
              if (!user) return null;

              const ok = verifyPasswordScrypt({
                password,
                salt: user.passwordSalt,
                expectedHashBase64: user.passwordHash,
              });
              if (!ok) return null;

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                roles: user.roles ?? [],
              } as any;
            },
          }),
        ]
      : [
          CognitoProvider({
            ...cognitoConfig(),
            authorization: { params: { scope: "openid email profile" } },
          }),
        ],
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (AUTH_MODE === "local" && user) {
        const cfg = localJwtConfig();
        const subject = (user as any).id ?? token.sub ?? "unknown";
        token.sub = subject;
        token.email = (user as any).email ?? token.email;
        token.roles = (user as any).roles ?? [];
        token.accessToken = signJwtHS256({
          secret: cfg.secret,
          issuer: cfg.issuer,
          audience: cfg.audience,
          subject,
          expiresInSeconds: Number.isFinite(cfg.ttlSeconds)
            ? cfg.ttlSeconds
            : 3600,
          claims: {
            email: token.email,
            name: (user as any).name,
            roles: token.roles,
          },
        });
        token.idToken = undefined;
        return token;
      }

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
        (session.user as any).roles = (token as any).roles;
      }
      return session;
    },
  },
};
