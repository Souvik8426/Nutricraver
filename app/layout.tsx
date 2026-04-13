import type { Metadata } from "next";
import { Inter, Noto_Serif } from "next/font/google";
import "./globals.css";
import Providers from "./Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "NutriCraver | Exquisite Culinary Curation",
  description: "Curated culinary experiences honoring your body's biometric needs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`light ${inter.variable} ${notoSerif.variable} antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@300,0..1&display=swap"
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen flex flex-col font-body bg-surface text-on-surface selection:bg-secondary-fixed selection:text-on-secondary-fixed">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
