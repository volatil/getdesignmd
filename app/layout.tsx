import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Generador DESIGN.md",
  description: "Extrae colores, tipografias y formas desde una URL.",
  icons: {
    icon: "/icon.svg"
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
