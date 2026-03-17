import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "Jaywing Strategy Tools",
  description: "Strategy and demand tracking tools for Jaywing clients",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${figtree.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
