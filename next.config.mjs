/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Allow rendering images from Instagram CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '*.fna.fbcdn.net',
      }
    ],
  },
};

export default nextConfig;
