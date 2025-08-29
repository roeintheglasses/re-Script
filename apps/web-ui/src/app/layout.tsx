import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Re-Script Dashboard',
  description: 'Advanced LLM-powered JavaScript unminifier and deobfuscator',
  keywords: ['javascript', 'unminifier', 'deobfuscator', 'llm', 'ai', 'code transformation'],
  authors: [{ name: 'Re-Script Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Re-Script Dashboard',
    description: 'Advanced LLM-powered JavaScript unminifier and deobfuscator',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Re-Script Dashboard',
    description: 'Advanced LLM-powered JavaScript unminifier and deobfuscator',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        <div id="root" className="h-full">
          {children}
        </div>
      </body>
    </html>
  );
}