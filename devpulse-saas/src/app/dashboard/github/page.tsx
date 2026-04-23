/**
 * GitHub Trending 仪表盘子页面
 */

"use client";

import { useEffect, useState } from "react";

interface Repo {
  rank: number;
  name: string;
  url: string;
  description: string;
  language: string;
  stars: string;
  forks: string;
  section: string;
  analysis?: {
    purpose: string;
    problem: string;
    domain: string;
    reason: string;
    highlight: string;
  };
}

const LANG_COLORS: Record<string, string> = {
  Python: "#3572A5", JavaScript: "#f1e05a", TypeScript: "#3178c6",
  Rust: "#dea584", Go: "#00ADD8", Java: "#b07219",
  "C++": "#f34b7d", "C#": "#178600", Swift: "#F05138",
  PHP: "#4F5D95", Shell: "#89e051", Ruby: "#701516",
};

export default function GithubPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/reports/${today}?type=GITHUB_TRENDING`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setRepos(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = repos.filter((r) => r.section === tab);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🐙 GitHub Trending</h1>

      {/* 日/周/月切换 */}
      <div className="flex gap-2">
        {(["daily", "weekly", "monthly"] as const).map((t) => {
          const label = t === "daily" ? "☀️ 今日" : t === "weekly" ? "📅 本周" : "🏆 本月";
          const count = repos.filter((r) => r.section === t).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === t
                  ? "bg-[var(--primary)] text-white"
                  : "bg-white text-gray-500 border border-gray-200 hover:border-[var(--primary)]"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* 项目卡片列表 */}
      <div className="space-y-4">
        {filtered.map((repo) => {
          const langColor = LANG_COLORS[repo.language] || "#9CA3AF";
          const starsNum = parseFloat(repo.stars.replace(/,/g, ""));
          const isHot = starsNum >= 1000;

          return (
            <div key={repo.name} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
              {/* 基础信息 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <a
                    href={repo.url}
                    target="_blank"
                    className="font-mono font-bold text-base text-[var(--text)] no-underline hover:text-[var(--primary)]"
                  >
                    {repo.name}
                  </a>
                  {repo.language && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <span className="lang-dot" style={{ background: langColor }} />
                      {repo.language}
                    </span>
                  )}
                  {isHot && (
                    <span className="px-2 py-0.5 bg-amber-50 border border-amber-300 rounded-full text-[10px] text-amber-700 font-semibold">
                      🔥 热门
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-400">★ {repo.stars}</span>
              </div>

              <p className="text-sm text-gray-500 mb-3">{repo.description}</p>

              {/* AI 深度分析 */}
              {repo.analysis && (
                <div className="bg-purple-50 border-l-3 border-[var(--secondary)] rounded-lg p-4 text-sm">
                  <h4 className="text-xs font-bold text-[var(--secondary)] mb-2 tracking-wider">✨ AI 分析</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold">🎯 用途</span>
                      <p className="text-xs text-gray-700 mt-0.5">{repo.analysis.purpose}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold">🔧 解决</span>
                      <p className="text-xs text-gray-700 mt-0.5">{repo.analysis.problem}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold">📍 领域</span>
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-purple-100 rounded-full text-[10px] text-[var(--secondary)] font-medium">
                        {repo.analysis.domain}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold">🔥 上榜</span>
                      <p className="text-xs text-gray-700 mt-0.5">{repo.analysis.reason}</p>
                    </div>
                  </div>
                  {repo.analysis.highlight && (
                    <div className="mt-2 pt-2 border-t border-purple-100">
                      <span className="text-[10px] text-gray-400 font-semibold">⭐ 亮点</span>
                      <p className="text-xs text-[var(--primary)] font-medium mt-0.5">{repo.analysis.highlight}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">该时间段暂无数据</div>
        )}
      </div>
    </div>
  );
}
