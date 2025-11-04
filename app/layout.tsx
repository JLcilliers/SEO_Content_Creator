import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SEO Content Creator',
  description: 'Generate optimized content using your website context and Anthropic Claude',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
