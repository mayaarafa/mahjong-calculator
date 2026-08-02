import type { Metadata } from "next";
import { Zen_Maru_Gothic, Shippori_Mincho } from "next/font/google";
import Script from "next/script";
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
  title: "The Mahjong Calculator",
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
      {process.env.NODE_ENV === "production" && (
        <>
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-7EPCZTNL5Z"
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-7EPCZTNL5Z');
            `}
          </Script>
        </>
      )}
    </html>
  );
}
