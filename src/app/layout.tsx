import type { Metadata } from "next";
import { HeaderNav } from "@/components/navigation/HeaderNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bracket Arena",
  description: "Tournament bracket maker"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <header className="border-b border-line bg-arena/95">
          <HeaderNav />
        </header>
        {children}
      </body>
    </html>
  );
}
