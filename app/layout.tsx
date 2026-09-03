import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "OPC Policy Map｜全国创业政策地图",
  description: "以地图为入口，快速查看全国 OPC、AI 与创业政策。当前内容为演示数据。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
