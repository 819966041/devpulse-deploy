/**
 * 社区版布局
 * 不包含 <html> 和 <body>，这些只在根布局中定义
 */
import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "DevPulse 社区版 — 开发者 AI 技术日报（免费）",
  description:
    "社区版永久免费，AI 每日技术简报，一键注册即用，无需信用卡",
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* 社区版导航栏 */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/community" className="flex items-center gap-2 no-underline">
            <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center text-white font-bold text-sm">
              D
            </div>
            <span className="font-bold text-lg text-[var(--text)]">
              DevPulse <span className="text-sm font-normal text-gray-400">社区版</span>
            </span>
          </a>
          <div className="flex items-center gap-3 text-sm">
            <a href="#daily" className="text-gray-500 hover:text-[var(--primary)] no-underline">
              今日日报
            </a>
            <a href="#github" className="text-gray-500 hover:text-[var(--primary)] no-underline">
              GitHub
            </a>
            <a
              href="#join"
              className="px-4 py-1.5 bg-[var(--primary)] text-white rounded-lg text-sm no-underline hover:bg-[var(--primary-light)] transition"
            >
              立即加入
            </a>
          </div>
        </div>
      </nav>

      <main>{children}</main>

      {/* 社区版底部 */}
      <footer className="border-t border-gray-200 mt-16 py-8 text-center text-sm text-gray-400">
        <div className="max-w-5xl mx-auto px-4">
          <p>🆓 DevPulse 社区版 — 完全免费 · 开源贡献驱动</p>
          <p className="mt-1 text-xs text-gray-300">
            Powered by AI + Open Source Community
          </p>
        </div>
      </footer>
    </>
  );
}
