import type { Metadata } from "next";
import "./globals.css";
import GoogleTranslateLoader from "@/components/GoogleTranslateLoader";

// Using system font fallbacks to avoid fetching Google Fonts at build time

export const metadata: Metadata = {
  title: "SwarajDesk Admin Portal",
  description: "Admin dashboards for SwarajDesk complaint management system",
  icons: {
    icon: 'https://pub-6c77e16531784985b618e038085ecd96.r2.dev/logo.png',
    shortcut: 'https://pub-6c77e16531784985b618e038085ecd96.r2.dev/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <GoogleTranslateLoader />
        {children}
      </body>
    </html>
  );
}
