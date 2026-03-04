import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: 'The Dream Gift — Lámparas personalizadas únicas',
  description:
    'Convierte tus fotos favoritas en lámparas acrílicas LED únicas, grabadas con láser. Tu historia, hecha luz.',
  openGraph: {
    title: 'The Dream Gift — Lámparas personalizadas',
    description:
      'Convierte tu foto en una lámpara acrílica LED única, grabada con láser.',
    type: 'website',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
