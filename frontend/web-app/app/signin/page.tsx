"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

function authMode(): string {
  return (process.env.NEXT_PUBLIC_AUTH_MODE ?? "cognito").toLowerCase();
}

export default function SignInPage() {
  const mode = useMemo(() => authMode(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("demo@novamart.local");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onLocalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (!result || result.error) {
        setError("Invalid email or password.");
        return;
      }
      router.push(result.url ?? callbackUrl);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h1 className="text-xl font-semibold text-gray-900">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600">
          {mode === "local"
            ? "Local demo login (JWT)."
            : "Continue with Cognito to sign in."}
        </p>

        {mode === "local" ? (
          <form className="mt-6 space-y-4" onSubmit={onLocalSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <div className="mt-1 text-xs text-gray-500">
                Demo: <span className="font-mono">demo@novamart.local</span> /{" "}
                <span className="font-mono">demo1234</span>
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-600" role="alert">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : (
          <div className="mt-6">
            <button
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-semibold"
              onClick={() => signIn("cognito", { callbackUrl })}
            >
              Continue with Cognito
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

