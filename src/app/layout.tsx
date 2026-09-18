import type { Metadata } from 'next';
import { Newsreader, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const editorialSerif = Newsreader({
  variable: '--font-editorial',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600'],
});

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SideDoor — Local Event Discovery & AgentMail',
  description: 'An autonomous scout discovering indie rock, independent print markets, and small-door art openings.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${editorialSerif.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#fafaf9] text-[#1c1917] selection:bg-stone-200 selection:text-stone-900 font-sans">
        {children}
      </body>
    </html>
  );
}
