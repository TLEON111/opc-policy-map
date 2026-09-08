import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone：为自托管 / Docker / Node PaaS 产出最小运行包。
  // Vercel 部署会忽略该输出（用自有运行时），保留不影响其构建。
  output: "standalone",
  outputFileTracingIncludes: {
    // 运行时 fs 读取的巡检数据（pool/last-report）要随产物一起部署，
    // 否则 Vercel 函数运行时读不到 data/ 目录。已核验 JSON 走 import 无需在此列。
    "/*": ["./data/pool/**/*.json"],
  },
};

export default nextConfig;
