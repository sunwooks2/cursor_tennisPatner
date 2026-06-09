import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs"],
  webpack: (config, { dev }) => {
    // Windows dev 환경에서 webpack 파일 캐시 손상으로 CSS 404가 나는 문제 방지
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default nextConfig;
