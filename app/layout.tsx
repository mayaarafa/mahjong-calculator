import type { Metadata } from "next";
import { Zen_Maru_Gothic, Shippori_Mincho } from "next/font/google";
import "./globals.css";

const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const shipporiMincho = Shippori_Mincho({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Mahjong Scorer",
  description: "Chinese Official Rules hand scorer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${zenMaruGothic.variable} ${shipporiMincho.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
