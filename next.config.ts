import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            "@hyperlane-xyz/sdk": false,
            "@hyperlane-xyz/registry": false,
            "@hyperlane-xyz/utils": false,
            "@solana/web3.js": false,
            "@metamask/sdk": false,
        };

        config.experiments = {
            ...config.experiments,
            topLevelAwait: true,
            asyncWebAssembly: true,
        };
        
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
        }
    return config;
  },
};

export default nextConfig;
