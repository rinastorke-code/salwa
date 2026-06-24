import './globals.css';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { CommandPalette } from '@/components/command-palette';
import { Shell } from '@/components/shell';
import { RegisterSW } from '@/components/register-sw';

export const metadata: Metadata = {
  title: 'الشؤون الإدارية — اللاذقية',
  description: 'نظام إدارة الموارد البشرية والتفقّد اليومي',
  manifest: '/manifest.json',
};
export const viewport: Viewport = {
  themeColor: '#1a1d23', width: 'device-width', initialScale: 1, maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: 'var(--font-cairo)' }}>
        <NextIntlClientProvider messages={messages}>
          <RegisterSW />
          <CommandPalette />
          <Shell>{children}</Shell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
