/** @type {import('next').NextConfig} */
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Disable in development to prevent reload loops
});

const nextConfig = {
  reactCompiler: true,
  turbopack: {},
};

export default withPWA(nextConfig);
