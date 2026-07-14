import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppMessageHost from "@/components/AppMessageHost";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WageFlow",
  description: "Staff Management Simplified",
  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WageFlow",
  },

  icons: {
    icon: [
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    title: "WageFlow",
    description:
      "Staff records and payslip management platform for businesses.",
    url: "https://wageflow.lesedismartsolutions.co.za",
    siteName: "WageFlow",
    images: [
      {
        url: "https://wageflow.lesedismartsolutions.co.za/thumbnail.png",
        width: 1200,
        height: 630,
        alt: "WageFlow",
      },
    ],
    locale: "en_ZA",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "WageFlow",
    description:
      "Staff records and payslip management platform for businesses.",
    images: [
      "https://wageflow.lesedismartsolutions.co.za/thumbnail.png",
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0F4C81",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AppMessageHost />
      </body>
    </html>
  );
}