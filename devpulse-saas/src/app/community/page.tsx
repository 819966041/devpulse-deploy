/**
 * DevPulse AI — 社区版首页
 * 极简体验：动态日报 + 一键注册即用 + 无定价/仪表盘
 */
"use client";
import { useState, useEffect } from "react";
import "../globals.css";

interface TopItem {
  title: string;
  score: number;
  cat: string;
  summary: string;
  source: string;
  tags: string[];
  url: string;
}

interface GithubItem {
  title: string;
  stars: number;
  description: string;
  language: string;
  color: string;
  url: string;
}

interface DigestData {
  date: string;
  topItems: TopItem[];
  githubItems: GithubItem[];
}

export default function CommunityPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [digestData, setDigestData] = useState<DigestData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // 获取动态数据
  useEffect(() => {
    async function fetchDigestData() {
      try {
        const response = await fetch("/api/community/digest");
        if (!response.ok) {
          throw new Error("Failed to fetch digest data");
        }
        const data = await response.json();
        if (data.success) {
          setDigestData(data.data);
        } else {
          throw new Error(data.error || "Unknown error");
        }
      } catch (error) {
        console.error("Error fetching digest data:", error);
        setDataError(error instanceof Error ? error.message : "Failed to load data");
      } finally {
        setDataLoading(false);
      }
    }

    fetchDigestData();
  }, []);

  async function handleQuickRegister(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/community/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });
      const data = await res.json();

      if (data.ok) {
        setMessage({ type: "success", text: data.message || "注册成功！快去体验吧 🎉" });
        setName("");
        setEmail("");
      } else {
        setMessage({ type: "error", text: data.error || "注册失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误，请稍后重试" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* ===== Hero 区 ===== */}
      <section className="text-center py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="inline-block mb-4 px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full font-medium">
            🆓 社区版 · 永久免费 · 开源驱动
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            开发者的{" "}
            <span className="text-white bg-clip-text brand-gradient">
              AI 每日技术简报
            </span>
          </h1>
          <p className="text-base text-gray-500 mb-6 max-w-lg mx-auto">
            自动聚合 HackerNews、GitHub、知乎、微博等平台热点，
            AI 智能摘要 + 评分，每天 3 分钟掌握行业脉搏。
          </p>
          <div className="flex gap-3 justify-center">
            <a
              href="#daily"
              className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold no-underline hover:shadow-lg transition"
            >
              📰 查看今日日报
            </a>
            <a
              href="#join"
              className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 no-underline hover:border-[var(--primary)] hover:text-[var(--primary)] transition"
            >
              ⚡ 一键注册体验
            </a>
          </div>
        </div>
      </section>

      {/* ===== 今日日报 ===== */}
      <section id="daily" className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base">🔥 今日必读 TOP 5</h2>
              <p className="text-xs text-gray-400">AI 从 200+ 条资讯中精选</p>
            </div>
            <span className="text-xs text-gray-400">
              {dataLoading ? "加载中..." : digestData?.date || "今日"}
            </span>
          </div>
          
          <div className="divide-y divide-gray-50">
            {dataLoading ? (
              // 加载状态
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-400 text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-300 h-4 bg-gray-200 rounded w-3/4"></span>
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-semibold h-3 bg-gray-200 rounded w-16"></span>
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 h-3 bg-gray-200 rounded w-20"></span>
                      </div>
                      <p className="text-xs text-gray-300 mt-1 h-3 bg-gray-200 rounded w-full"></p>
                      <span className="text-[10px] text-gray-300 mt-1 inline-block h-3 bg-gray-200 rounded w-24"></span>
                    </div>
                  </div>
                </div>
              ))
            ) : dataError ? (
              // 错误状态
              <div className="px-6 py-8 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <p className="text-sm text-gray-500 mb-4">数据加载失败</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:shadow-lg transition"
                >
                  重新加载
                </button>
              </div>
            ) : (
              // 正常数据
              digestData?.topItems.map((item, i) => (
                <div key={i} className="px-6 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-sm text-gray-800 hover:text-[var(--primary)] transition-colors flex-1 min-w-0"
                        >
                          {item.title}
                        </a>
                        <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          item.score >= 9 ? "badge-must-read" : "badge-recommended"
                        }`}>
                          {item.score >= 9 ? "必读" : "推荐"} {item.score}
                        </span>
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                          {item.cat}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{item.summary}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-gray-300 inline-block">来源: {item.source}</span>
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] text-[var(--primary)] hover:underline flex items-center gap-1"
                        >
                          🔗 查看原文
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ===== GitHub Trending ===== */}
      <section id="github" className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-base">🐙 GitHub Trending 精选</h2>
            <p className="text-xs text-gray-400">AI 深度解读热门开源项目</p>
          </div>
          
          <div className="divide-y divide-gray-50">
            {dataLoading ? (
              // 加载状态
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-6 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm h-4 bg-gray-200 rounded w-32"></span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 h-3 bg-gray-200 rounded w-16"></span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 h-3 bg-gray-200 rounded w-full"></p>
                    </div>
                    <div className="flex-shrink-0 text-sm text-gray-400 h-4 bg-gray-200 rounded w-12"></div>
                  </div>
                </div>
              ))
            ) : dataError ? (
              // 错误状态已在上面处理，这里可以显示空状态或占位符
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-gray-500">GitHub数据加载失败</p>
              </div>
            ) : (
              // 正常数据
              digestData?.githubItems.map((repo, i) => (
                <div key={i} className="px-6 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a 
                          href={repo.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-sm text-[var(--primary)] hover:text-blue-600 transition-colors flex-1 min-w-0"
                        >
                          {repo.title}
                        </a>
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                          <span className="lang-dot" style={{ background: repo.color }}></span>
                          {repo.language}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{repo.description}</p>
                    </div>
                    <div className="flex-shrink-0 text-sm text-gray-400 flex items-center gap-2">
                      ⭐ {(repo.stars / 1000).toFixed(1)}k
                      <a 
                        href={repo.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] text-[var(--primary)] hover:underline"
                      >
                        🔗 查看
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ===== 注册表单 ===== */}
      <section id="join" className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2">⚡ 一键注册，立即体验</h2>
            <p className="text-sm text-gray-400">只需一个邮箱，3秒完成注册，默认密码已为你生成</p>
          </div>
          <form className="space-y-3">
            <input
              type="text"
              placeholder="你的昵称（选填）"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              placeholder="your@email.com"
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="bg-gray-50 rounded-lg px-4 py-2 text-xs text-gray-400">
              🔑 默认密码: <code className="text-gray-600 font-mono">devpulse2024</code>（注册后可修改）
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold hover:shadow-lg disabled:opacity-50 transition"
            >
              {loading ? "注册中..." : "立即注册"}
            </button>
          </form>
          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              message.type === "success" 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {message.text}
            </div>
          )}
          <p className="text-center text-xs text-gray-300 mt-4">
            注册即代表同意社区规范 · 永久免费 · 无需信用卡
          </p>
        </div>
      </section>
    </div>
  );
}