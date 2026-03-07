import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { UtmTracker } from '@/components/UtmTracker';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '1310654400890735';
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
        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      </head>
      <body>
        {/* Noscript fallback for users with JS disabled */}
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        <AuthProvider>
          <UtmTracker />
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
