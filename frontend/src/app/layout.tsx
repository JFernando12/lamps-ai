import type { Metadata, Viewport } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ConfigProvider } from '@/contexts/ConfigContext';
import Navbar from '@/components/Navbar';
import { UtmTracker } from '@/components/UtmTracker';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thedreamgiftmx.com';
const FB_DOMAIN_VERIFICATION =
  process.env.NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION ?? '';

export const metadata: Metadata = {
  title: 'The Dream Gift — Lámparas personalizadas únicas',
  description:
    'Convierte tus fotos favoritas en lámparas acrílicas LED únicas, grabadas con láser. Tu historia, hecha luz.',
  openGraph: {
    title: 'The Dream Gift — Lámparas personalizadas',
    description:
      'Convierte tu foto en una lámpara acrílica LED única, grabada con láser.',
    type: 'website',
    url: SITE_URL,
    siteName: 'The Dream Gift',
    images: [
      {
        url: `${SITE_URL}/gallery/lampara-2-v2.jpg`,
        width: 1200,
        height: 630,
        alt: 'Lámpara acrílica LED RGB personalizada — The Dream Gift',
      },
    ],
  },
  ...(FB_DOMAIN_VERIFICATION
    ? { other: { 'facebook-domain-verification': FB_DOMAIN_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* TEMP: Meta Pixel disabled for perf diagnostic — restore before merging */}
      </head>
      <body>
        <ConfigProvider>
          <AuthProvider>
            <UtmTracker />
            <Navbar />
            {children}
          </AuthProvider>
        </ConfigProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
