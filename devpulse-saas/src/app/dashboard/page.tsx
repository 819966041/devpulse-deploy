/**
 * DevPulse AI — 用户仪表盘
 * 核心页面：展示每日 AI 技术日报
 * 
 * 两种状态：
 * 1. 有数据：显示日报列表、统计卡、筛选搜索
 * 2. 无数据：显示引导提示（首次使用 / 等待采集）
 */
"use client";

import { useState, useEffect } from "react";

// ========== 类型定义 ==========
interface ReportItem {
  title: string;
  url: string;
  source: string;
  score?: number;
  category?: string;
  summary?: string;
  aiScore?: number;
  extra?: Record<string, unknown>;
}

interface DailyReport {
  id: string;
  date: string;
  type: string;
  data: {
    date: string;
    items: ReportItem[];
    generatedAt: string;
    summary: string;
  };
}

// ========== 平台图标映射 ==========
const sourceIcons: Record<string, string> = {
  hackernews: "🔶",
  github_trending: "🐙",
  weibo: "🔴",
  zhihu: "🔵",
  producthunt: "🟠",
  bilibili: "📺",
  douyin: "🎵",
};

// ========== 主组件 ==========
export default function DashboardPage() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const res = await fetch("/api/reports?recent=7&type=DIGEST");
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        if (data.length > 0) {
          setSelectedDate(data[0].date);
        }
      }
    } catch (err) {
      console.error("获取日报失败:", err);
    } finally {
      setLoading(false);
    }
  }

  // 获取当前选中的日报
  const currentReport = reports.find((r) => r.date === selectedDate);

  // 过滤 & 搜索
  const filteredItems = (currentReport?.data?.items || []).filter((item) => {
    const matchSource = filter === "all" || item.source === filter;
    const matchSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSource && matchSearch;
  });

  // 统计各平台数量
  const sourceCounts: Record<string, number> = {};
  (currentReport?.data?.items || []).forEach((item) => {
    sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1;
  });

  // ===== 加载中 =====
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">正在加载日报...</p>
        </div>
      </div>
    );
  }

  // ===== 无数据（首次使用） =====
  if (reports.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6">📭</div>
        <h1 className="text-2xl font-bold mb-3">暂无日报数据</h1>
        <p className="text-gray-500 mb-2">
          日报数据需要通过采集脚本生成，请按以下步骤操作：
        </p>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-left mt-6 mb-6">
          <h3 className="font-semibold text-sm mb-3">🚀 快速开始</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-[var(--primary)] text-white text-xs rounded-full flex items-center justify-center font-bold">1</span>
              <span>配置 <code className="bg-gray-100 px-1 rounded">.env</code> 文件中的 <code className="bg-gray-100 px-1 rounded">DATABASE_URL</code></span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-[var(--primary)] text-white text-xs rounded-full flex items-center justify-center font-bold">2</span>
              <span>运行 <code className="bg-gray-100 px-1 rounded">npx prisma db push</code> 初始化数据库</span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-[var(--primary)] text-white text-xs rounded-full flex items-center justify-center font-bold">3</span>
              <span>运行 <code className="bg-gray-100 px-1 rounded">node scripts/collect.js</code> 采集数据</span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-[var(--primary)] text-white text-xs rounded-full flex items-center justify-center font-bold">4</span>
              <span>刷新此页面即可看到日报</span>
            </li>
          </ol>
        </div>
        <div className="flex gap-3 justify-center">
          <a
            href="/demo"
            className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold no-underline hover:shadow-lg"
          >
            查看示例日报
          </a>
          <button
            onClick={() => fetchReports()}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-[var(--primary)]"
          >
            🔄 刷新
          </button>
        </div>
      </div>
    );
  }

  // ===== 有数据 =====
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">📊 我的仪表盘</h1>
        <p className="text-gray-500 text-sm">每日 AI 技术日报，最近 7 天数据</p>
      </div>

      {/* 日期选择器 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {reports.map((report) => (
          <button
            key={report.date}
            onClick={() => setSelectedDate(report.date)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedDate === report.date
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-[var(--primary)]"
            }`}
          >
            {report.date}
          </button>
        ))}
      </div>

      {/* 搜索 & 过滤栏 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="搜索资讯标题或摘要..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[var(--primary)]"
        />
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilter("all")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === "all"
                ? "bg-[var(--primary)] text-white"
                : "bg-white border border-gray-200 text-gray-500"
            }`}
          >
            全部
          </button>
          {Object.entries(sourceCounts).map(([source, count]) => (
            <button
              key={source}
              onClick={() => setFilter(source)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === source
                  ? "bg-[var(--primary)] text-white"
                  : "bg-white border border-gray-200 text-gray-500"
              }`}
            >
              {sourceIcons[source] || "📌"} {source} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* 日报统计卡 */}
      {currentReport && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-[var(--primary)]">
              {currentReport.data.items.length}
            </div>
            <div className="text-xs text-gray-400 mt-1">总资讯数</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-[var(--secondary)]">
              {Object.keys(sourceCounts).length}
            </div>
            <div className="text-xs text-gray-400 mt-1">覆盖平台</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-[var(--accent)]">
              {filteredItems.filter((i) => (i.aiScore || i.score || 0) >= 8).length}
            </div>
            <div className="text-xs text-gray-400 mt-1">高评分(≥8)</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-[var(--success)]">
              {filteredItems.filter((i) => i.source === "github_trending").length}
            </div>
            <div className="text-xs text-gray-400 mt-1">GitHub 项目</div>
          </div>
        </div>
      )}

      {/* 资讯列表 */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <p>暂无匹配的资讯</p>
            <button
              onClick={() => { setFilter("all"); setSearchQuery(""); }}
              className="mt-2 text-sm text-[var(--primary)] bg-transparent border-none cursor-pointer"
            >
              清除筛选
            </button>
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-bold">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-sm text-gray-800 hover:text-[var(--primary)] no-underline"
                    >
                      {item.title}
                    </a>
                    {(item.aiScore || item.score) && (
                      <span
                        className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          (item.aiScore || item.score!) >= 9
                            ? "badge-must-read"
                            : (item.aiScore || item.score!) >= 7
                            ? "badge-recommended"
                            : "badge-worth"
                        }`}
                      >
                        {(item.aiScore || item.score!) >= 9 ? "必读" : "推荐"}{" "}
                        {item.aiScore || item.score}
                      </span>
                    )}
                    {item.category && (
                      <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                        {item.category}
                      </span>
                    )}
                  </div>
                  {item.summary && (
                    <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{item.summary}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                    <span>{sourceIcons[item.source] || "📌"} {item.source}</span>
                    {item.extra?.language && <span>语言: {item.extra.language as string}</span>}
                    {item.extra?.stars && <span>⭐ {item.extra.stars as number}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部提示 */}
      {currentReport && (
        <div className="text-center mt-8 text-sm text-gray-400">
          <p>📅 {currentReport.data.summary}</p>
          <p className="mt-1">
            生成于 {new Date(currentReport.data.generatedAt).toLocaleString("zh-CN")}
          </p>
        </div>
      )}
    </div>
  );
}
