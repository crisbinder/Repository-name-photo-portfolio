import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crisbinder的个人摄影集",
  description: "风光、星空、人像与人文摄影作品集"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
