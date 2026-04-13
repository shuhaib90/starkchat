import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StarkzapProvider } from "@/components/StarkzapProvider";
import { RealtimeNotifier } from "@/components/RealtimeNotifier";
import { SignalLoader } from "@/components/SignalLoader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StarkChat - Web3 Chat & Payments",
  description: "Real-time chat and Starknet payments integrated using Starkzap and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased bg-[#06070a] text-[#f0ede8] min-h-screen overflow-x-hidden`}
      >
        <StarkzapProvider>
          <SignalLoader />
          <RealtimeNotifier />
          <div className="perspective-container min-h-screen flex flex-col">
            {children}
          </div>
        </StarkzapProvider>
      </body>
    </html>
  );
}
