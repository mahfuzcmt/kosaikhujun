import type { Metadata, Viewport } from "next";
import "@fontsource/hind-siliguri/300.css";
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/500.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/hind-siliguri/700.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "কসাই বাড়ি - আপনার লোকেশনে নির্ভরযোগ্য কসাই খুঁজুন",
  description: "কসাই বাড়ি - বাংলাদেশের সবচেয়ে বড় কসাই মার্কেটপ্লেস। আপনার এলাকায় অভিজ্ঞ কসাই খুঁজুন।",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1B8B4B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn">
      <body className="font-bengali antialiased bg-gray-50">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
