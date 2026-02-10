import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { WalletProvider } from "@/components/WalletConnect";

export const metadata: Metadata = {
  title: "SkillForge — Agent Skill Store",
  description: "Discover, install, and publish AI agent skills. Powered by $OPENWORK.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="noise-bg min-h-screen antialiased">
        <WalletProvider>
          <Navbar />
          <main className="relative z-10">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}