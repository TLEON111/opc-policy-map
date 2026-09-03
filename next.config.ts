import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone：为自托管 / Docker / Node PaaS 产出最小运行包
  // （fs 读取的 data/pool/*.json 不在产物内，需随运行目录提供，见 Dockerfile/README）
  output: "standalone",
};

export default nextConfig;
