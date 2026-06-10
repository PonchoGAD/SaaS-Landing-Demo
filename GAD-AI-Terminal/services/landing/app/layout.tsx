import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'GAD AI Terminal — Solana Degen Bot',
    template: '%s · GAD AI Terminal',
  },
  description: 'The Solana meme-token analytics terminal. Whale alerts, AI risk scoring, rug detection. Open @gadai_sol_bot on Telegram.',
  openGraph: {
    title: 'GAD AI Terminal',
    description: 'Scan meme coins. Track whales. Never get rugged again (probably).',
    siteName: 'GAD AI Terminal',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#050508', color: '#fff' }}>
        {children}
      </body>
    </html>
  );
}
