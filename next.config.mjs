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
  async redirects() {
    return [
      {
        source: '/admin/review',
        destination: '/admin',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
