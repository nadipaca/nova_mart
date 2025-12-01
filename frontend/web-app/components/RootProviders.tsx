"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/context/CartContext";
import { Navbar } from "@/components/Navbar";

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        <Navbar />
        {children}
      </CartProvider>
    </SessionProvider>
  );
}

