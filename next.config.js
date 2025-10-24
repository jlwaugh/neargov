/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["every-plugin"],
  outputFileTracingRoot: process.cwd(),

  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

module.exports = nextConfig;
