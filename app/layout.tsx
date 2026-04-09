import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { MainNav } from "@/components/navigation/main-nav";
import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Office Accounting",
    template: "%s | Office Accounting",
  },
  description: "Next.js 14 + Supabase application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen font-sans antialiased`}
      >
        <AppProviders>
          <MainNav />
          <main>{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
