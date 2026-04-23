/**
 * 历史日报页面
 */

"use client";

import { useEffect, useState } from "react";

interface ReportSummary {
  id: string;
  date: string;
  type: string;
  createdAt: string;
}

interface NewsItem {
  title: string;
  url: string;
  source: string;
  category: string;
  summary?: string;
  value?: number;
}

export default function HistoryPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemLoading, setItemLoading] = useState(false);

  useEffect(() => {
    fetch("/api/reports?limit=30")
      .then((r) => r.json())
      .then((res) => {
        if (res.reports) {
          setReports(res.reports);
          if (res.reports.length > 0) {
            loadReport(res.reports[0].date);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function loadReport(date: string) {
    setSelectedDate(date);
    setItemLoading(true);
    try {
      const res = await fetch(`/api/reports/${date}?type=DIGEST`);
      const data = await res.json();
      setItems(data.data || []);
    } catch {
      setItems([]);
    } finally {
      setItemLoading(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📅 历史日报</h1>

      <div className="flex gap-4">
        {/* 日期列表 */}
        <div className="w-40 flex-shrink-0">
          <div className="space-y-1">
            {reports.map((r) => (
              <button
                key={r.date}
                onClick={() => loadReport(r.date)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  selectedDate === r.date
                    ? "bg-[var(--primary)] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {r.date.slice(5)}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 min-w-0">
          {itemLoading ? (
            <div className="text-center py-12 text-gray-400">加载中...</div>
          ) : items.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {items.map((item, i) => (
                <div key={i} className="px-5 py-3 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-2">
                    <a
                      href={item.url}
                      target="_blank"
                      className="text-sm font-medium text-gray-800 no-underline hover:text-[var(--primary)]"
                    >
                      {item.title}
                    </a>
                    {item.value && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          item.value >= 9
                            ? "badge-must-read"
                            : item.value >= 7
                            ? "badge-recommended"
                            : "badge-worth"
                        }`}
                      >
                        {item.value >= 9 ? "必读" : "推荐"} {item.value}
                      </span>
                    )}
                  </div>
                  {item.summary && <p className="text-xs text-gray-400 mt-1">{item.summary}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              {selectedDate ? "该日期暂无数据" : "请选择日期"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
