/**
 * 账户设置页面
 * - 查看当前套餐
 * - 管理邮件订阅
 * - 管理API密钥
 * - 升级/取消订阅
 */

"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [plan, setPlan] = useState("FREE");
  const [emailSubscribed, setEmailSubscribed] = useState(false);
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; keyPrefix: string; lastUsedAt: string | null }[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟获取用户信息（实际应从 session 获取）
    setLoading(false);
  }, []);

  const planLabel: Record<string, { name: string; color: string }> = {
    FREE: { name: "免费版", color: "bg-gray-100 text-gray-600" },
    PRO: { name: "专业版", color: "bg-indigo-100 text-indigo-700" },
    TEAM: { name: "团队版", color: "bg-purple-100 text-purple-700" },
  };

  const currentPlan = planLabel[plan] || planLabel.FREE;

  async function toggleEmailSub() {
    const method = emailSubscribed ? "DELETE" : "POST";
    const res = await fetch("/api/subscribe", { method });
    if (res.ok) setEmailSubscribed(!emailSubscribed);
  }

  async function createApiKey() {
    if (!newKeyName.trim()) return;
    // 调用 API 创建密钥
    setNewKeyName("");
  }

  async function deleteApiKey(id: string) {
    setApiKeys(apiKeys.filter((k) => k.id !== id));
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold">⚙️ 账户设置</h1>

      {/* 当前套餐 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-bold text-base mb-3">当前套餐</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${currentPlan.color}`}>
              {currentPlan.name}
            </span>
            {plan === "FREE" && (
              <span className="text-sm text-gray-400">升级专业版获取完整功能</span>
            )}
          </div>
          {plan === "FREE" ? (
            <a
              href="/pricing"
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold no-underline hover:shadow-md"
            >
              升级套餐
            </a>
          ) : (
            <a
              href="#"
              onClick={() => fetch("/api/stripe/portal", { method: "POST" }).then(r => r.json()).then(d => d.url && window.open(d.url))}
              className="text-sm text-gray-500 no-underline hover:text-[var(--primary)]"
            >
              管理订阅 →
            </a>
          )}
        </div>
      </div>

      {/* 邮件订阅 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-bold text-base mb-3">📧 邮件推送</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              {emailSubscribed ? "已开启每日邮件推送" : "未开启邮件推送"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              每天早上自动发送 AI 精选日报到你的邮箱
            </p>
          </div>
          <button
            onClick={toggleEmailSub}
            disabled={plan === "FREE"}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              emailSubscribed
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-[var(--primary)] text-white hover:shadow-md"
            } ${plan === "FREE" ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {emailSubscribed ? "取消订阅" : "开启订阅"}
          </button>
        </div>
        {plan === "FREE" && (
          <p className="text-xs text-amber-600 mt-2">💡 邮件推送为专业版功能</p>
        )}
      </div>

      {/* API 密钥 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-bold text-base mb-3">🔑 API 密钥</h2>
        {plan === "FREE" ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400 mb-3">API 接口为专业版功能</p>
            <a href="/pricing" className="text-sm text-[var(--primary)] font-medium no-underline">
              升级解锁 →
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                <div>
                  <span className="text-sm font-medium text-gray-700">{key.name}</span>
                  <code className="ml-3 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                    {key.keyPrefix}...
                  </code>
                </div>
                <button
                  onClick={() => deleteApiKey(key.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  删除
                </button>
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="密钥名称"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
              />
              <button
                onClick={createApiKey}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:shadow-md"
              >
                创建
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
