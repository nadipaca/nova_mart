"use client";

import { ReactNode } from "react";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/context/CartContext";
import { Navbar } from "@/components/Navbar";

export function RootProviders({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <CartProvider>
        <Navbar />
        {children}
      </CartProvider>
    </SessionProvider>
  );
}
