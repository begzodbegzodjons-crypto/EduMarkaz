import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduMarkaz ERP — O'quv Markaz Boshqaruv Tizimi",
  description: "O'quv markazlari uchun zamonaviy boshqaruv tizimi. Talabalar, guruhlar, to'lovlar, davomat va boshqalar bir joyda.",
  keywords: ["ERP", "o'quv markaz", "ta'lim", "boshqaruv", "talabalar"],
  authors: [{ name: "NorinKomp" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
