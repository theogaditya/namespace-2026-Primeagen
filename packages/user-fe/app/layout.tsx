import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import CapacitorBackHandler from "@/components/CapacitorBackHandler";
import GoogleTranslateLoader from "@/components/GoogleTranslateLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SwarajDesk",
  description: "Voice your issue",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Hide the default Google Translate toolbar */}
        <style>{`.goog-te-banner-frame { display: none !important; } body { top: 0 !important; }`}</style>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${plusJakarta.variable} ${inter.variable} antialiased`}
      >
        <GoogleTranslateLoader />
        <CapacitorBackHandler />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
