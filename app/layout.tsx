import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Warp Protocol: Dark Pulse',
  description: 'Neural grid warfare. Disable their cores before they disable yours.',
  themeColor: '#050c14',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-dp-bg text-dp-text font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
