/**
 * 退订页面
 * /unsubscribe?email=user@example.com
 * 从邮件链接直接跳转，或手动输入邮箱退订
 */
"use client";
import { useState, useEffect } from "react";
import "../globals.css";

export default function UnsubscribePage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // 从 URL 参数读取 email
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  async function handleUnsubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/community/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.ok) {
        setMessage({ type: "success", text: data.message });
        setDone(true);
      } else {
        setMessage({ type: "error", text: data.error || "退订失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误，请稍后重试" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg, #F0F2F8)] flex flex-col">
      {/* 简洁导航 */}
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
        </div>
      </nav>

      {/* 主体内容 */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            {done ? (
              // 退订成功
              <div className="text-center">
                <div className="text-5xl mb-4">👋</div>
                <h1 className="text-xl font-bold mb-2">已退订</h1>
                <p className="text-sm text-gray-500 mb-6">{message?.text}</p>
                <a
                  href="/community"
                  className="inline-block px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold no-underline hover:shadow-lg transition"
                >
                  返回社区首页
                </a>
              </div>
            ) : (
              // 退订表单
              <>
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold mb-2">退订每日推送</h1>
                  <p className="text-sm text-gray-400">
                    退订后将不再收到 DevPulse AI 每日技术简报邮件
                  </p>
                </div>
                <form onSubmit={handleUnsubscribe} className="space-y-3">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold hover:shadow-lg disabled:opacity-50 transition"
                  >
                    {loading ? "处理中..." : "确认退订"}
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
                  退订后仍可随时在社区版重新订阅
                </p>
              </>
            )}
          </div>
        </div>
      </main>

      {/* 底部 */}
      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-400">
        <p>DevPulse AI · 开发者 AI 技术日报</p>
      </footer>
    </div>
  );
}
