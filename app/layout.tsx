import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'SaaS Landing Demo',
    template: '%s · SaaS Landing Demo',
  },
  description: 'Clean SaaS landing built with Next.js App Router',
  openGraph: {
    title: 'SaaS Landing Demo',
    description: 'Clean SaaS landing built with Next.js',
    images: ['/og.png'],
  },
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
