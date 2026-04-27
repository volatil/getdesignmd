import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const title = "Generador DESIGN.md";
const description = "Extrae colores, tipografias y formas desde una URL.";
const ogImage = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Generador DESIGN.md analizando una URL y creando un documento DESIGN.md"
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  icons: {
    icon: "/icon.svg"
  },
  openGraph: {
    title,
    description,
    type: "website",
    images: [ogImage]
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
