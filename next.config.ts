import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            "child_process": false,
            "crypto": false,
            "fs": false,
            "net": false,
            "tls": false,
            "pino-pretty": false,
            "os": false,
            "path": false,
            "stream": false,
            "zlib": false,
            "http": false,
            "https": false,
        };
        
        config.resolve.alias = {
            ...config.resolve.alias,
            "@hyperlane-xyz/sdk": false,
            "@hyperlane-xyz/registry": false,
            "@hyperlane-xyz/utils": false,
            "@fatsolutions/tongo-sdk": false,
            "@solana/web3.js": false,
        };
    }
    return config;
  },
};

export default nextConfig;
