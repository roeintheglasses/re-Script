import "@/styles/globals.css";

import { Inter } from "next/font/google";
import { Providers } from "./providers";
import Nav from "@/components/Nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "re-Script",
  description: "AI Powered Code JS Code Un-minifier",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <head />
      <body className="relative min-h-screen bg-gradient-to-tr from-zinc-900/50 to-zinc-700/30">
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
