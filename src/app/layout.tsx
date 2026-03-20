import type { Metadata } from "next";
import { Oswald, Roboto } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClientErrorMonitor from "@/components/ClientErrorMonitor";

const oswald = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const roboto = Roboto({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Chimera Enterprise | Premium Renovation & Project Planning",
  description: "Expert renovation, project planning, and construction services. Local. Trusted. Premium craft.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/final/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/final/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/final/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/brand/final/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${oswald.variable} ${roboto.variable}`}>
      <body className="font-sans antialiased bg-chimera-black text-chimera-text-primary">
        <ClientErrorMonitor />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
