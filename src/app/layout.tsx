import type { Metadata } from "next";
import { HeaderNav } from "@/components/navigation/HeaderNav";
import { LanguageRuntimeTranslator } from "@/components/theme/LanguageRuntimeTranslator";
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
        <LanguageRuntimeTranslator />
        <header className="border-b border-line bg-arena/95">
          <HeaderNav />
        </header>
        {children}
      </body>
    </html>
  );
}
