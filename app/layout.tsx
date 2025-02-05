import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Flow",
  description: "Track. Save. Grow.",
};

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <Header />
          <main className="min-h-screen">{children}</main>
          <footer className="bg-blue-50 py-12">
            <div className="container mx-auto text-center px-4 text-gray-600">
              Copyright 2025 Flow
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
