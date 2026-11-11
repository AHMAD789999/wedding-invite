/** @type {import('next').NextPage} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'absa-site.pages.dev',
      },
    ],
  },
};

module.exports = nextConfig;