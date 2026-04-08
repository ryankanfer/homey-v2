import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, Playfair_Display } from 'next/font/google';
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'homey.',
  description: 'The NYC market is designed to overwhelm you. homey. is not.',
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  themeColor: '#0D0D0B',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark scroll-smooth ${instrumentSans.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-[#0D0D0B] text-[#F0EDE8] antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
