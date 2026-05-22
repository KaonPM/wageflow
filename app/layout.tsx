import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}