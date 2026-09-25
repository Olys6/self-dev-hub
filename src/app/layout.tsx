import type { Metadata } from "next";
import { Figtree, Caprasimo } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const caprasimo = Caprasimo({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Hub",
  description: "Personal goals, routines, and projects — one place to see the day.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${caprasimo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
