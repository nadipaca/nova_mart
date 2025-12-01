"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function SignInButton() {
  const { data: session, status } = useSession();
  if (status === "loading") {
    return <button className="px-3 py-1 border rounded text-xs">...</button>;
  }
  if (session) {
    return null;
  }
  return (
    <button
      className="px-3 py-1 border rounded text-xs"
      onClick={() => signIn("cognito")}
    >
      Sign in
    </button>
  );
}

export function SignOutButton() {
  const { data: session } = useSession();
  if (!session) {
    return null;
  }
  return (
    <button
      className="px-3 py-1 border rounded text-xs"
      onClick={() => signOut()}
    >
      Sign out
    </button>
  );
}

export function useSessionUser() {
  const { data: session } = useSession();
  return session?.user as any | undefined;
}
