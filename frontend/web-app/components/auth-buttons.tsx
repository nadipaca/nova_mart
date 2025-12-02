"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function SignInButton() {
  const { data: session, status } = useSession();
  
  // Always render a button to prevent layout shift
  if (status === "loading") {
    return (
      <button className="px-3 py-2 border rounded text-sm opacity-50 cursor-wait" disabled>
        Loading...
      </button>
    );
  }
  
  if (session) {
    return null;
  }
  
  return (
    <button
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-semibold"
      onClick={() => signIn("cognito")}
    >
      Sign In
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
      className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
      onClick={() => signOut()}
    >
      Sign Out
    </button>
  );
}

export function useSessionUser() {
  const { data: session } = useSession();
  return session?.user as any | undefined;
}