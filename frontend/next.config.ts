import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 圖片優化設定
  images: {
    unoptimized: false,
    // 如果需要外部圖片，取消下行註解並配置
    // remotePatterns: [],
  },
  
  // 環境變數
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default nextConfig;
