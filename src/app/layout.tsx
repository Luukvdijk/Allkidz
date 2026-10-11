import type { Metadata } from "next";
import { Assistant, Geist_Mono } from "next/font/google";
import "./globals.css";

// Assistant is the typeface of all-kidz.nl.
const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AllKidz Planning (demo)",
  description: "Demo planning-app voor AllKidz met fictieve testdata",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      className={`${assistant.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
