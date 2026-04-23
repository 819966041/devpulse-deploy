/**
 * DevPulse AI — 根布局（最简）
 * 只提供 <html> + <body> + globals.css
 * 具体导航栏/Footer 由各路由组的 layout.tsx 负责
 */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevPulse AI — 中文开发者 AI 技术日报",
  description:
    "每日自动聚合 12+ 中英文平台热点资讯，AI 智能摘要、分类、评分，GitHub 项目深度解读",
  keywords: ["技术日报", "AI日报", "开发者资讯", "GitHub Trending", "HackerNews"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
