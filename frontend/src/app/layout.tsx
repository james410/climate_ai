// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VERDISLE – Islands of Heat, Cities of Change',
  description: 'Data science art · Heat island live monitoring',
};

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="noise-overlay" />
          {children}
      </body>
    </html>
  );
}
