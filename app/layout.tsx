import type { Metadata } from 'next';
import './globals.css';
import { siteUrl } from '@/lib/siteUrl';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'MenuSheet — QR Code Digital Menu for ₹100/month',
    template: '%s — MenuSheet',
  },
  description:
    'MenuSheet gives every restaurant a beautiful QR-code digital menu. No app, no backend, no hassle — just ₹100/month.',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-gray-900">{children}</body>
    </html>
  );
}
