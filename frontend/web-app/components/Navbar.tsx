"use client";

import Link from "next/link";
import { SignInButton, SignOutButton, useSessionUser } from "./auth-buttons";

export function Navbar() {
  const user = useSessionUser();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-xl font-semibold">
          NovaMart
        </Link>
        <nav className="flex gap-3 text-sm text-gray-700">
          <Link href="/products">Products</Link>
          <Link href="/cart">Cart</Link>
        </nav>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {user && <span className="text-gray-600">Hi, {user.name ?? user.sub}</span>}
        <SignInButton />
        <SignOutButton />
      </div>
    </header>
  );
}
