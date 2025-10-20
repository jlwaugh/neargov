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

// Configure undici to prefer IPv4 and increase timeouts
if (typeof global !== "undefined") {
  const { setGlobalDispatcher, Agent } = require("undici");
  setGlobalDispatcher(
    new Agent({
      connect: {
        timeout: 60000,
        // Force IPv4
        lookup: (hostname, options, callback) => {
          const dns = require("dns");
          dns.lookup(hostname, { family: 4, ...options }, callback);
        },
      },
      bodyTimeout: 60000,
      headersTimeout: 60000,
    })
  );
}

module.exports = nextConfig;
