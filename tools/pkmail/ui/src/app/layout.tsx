import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PKMail",
  description: "Client mail terminal pour Gmail",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
