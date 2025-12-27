import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { RootProviders } from "@/components/RootProviders";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "NovaMart",
  description: "NovaMart e-commerce frontend"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <RootProviders session={session}>
          {children}
        </RootProviders>
      </body>
    </html>
  );
}
