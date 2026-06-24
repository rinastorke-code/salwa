import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lightweight build for low-end field devices
  experimental: { optimizePackageImports: ['lucide-react'] },
};
export default withNextIntl(nextConfig);
