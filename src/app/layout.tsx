import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nimbus Exposure Ledger — Physical Climate Risk Exposure (FY 2025-26 to 2040)",
  description:
    "Board-ready, auditor-traceable physical climate risk exposure ledger for Nimbus Cement Ltd across 9 Indian cement facilities and clinker supply chains.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
