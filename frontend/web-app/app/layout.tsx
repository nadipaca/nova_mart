import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { RootProviders } from "@/components/RootProviders";

export const metadata: Metadata = {
  title: "NovaMart",
  description: "NovaMart e-commerce frontend"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <RootProviders>
          <main className="max-w-5xl mx-auto px-6 py-6">{children}</main>
        </RootProviders>
      </body>
    </html>
  );
}
