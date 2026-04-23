/**
 * 登录/注册页面
 * 统一入口，使用 signIn() API 正确对接 NextAuth
 */
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        // 1. 先注册
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const regData = await regRes.json();
        if (!regRes.ok) {
          setError(regData.error || "注册失败");
          return;
        }
      }

      // 2. 使用 next-auth signIn() 登录
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        // 登录成功，跳转到仪表盘或回调地址
        const params = new URLSearchParams(window.location.search);
        const callbackUrl = params.get("callbackUrl") || "/dashboard";
        window.location.href = callbackUrl;
      }
    } catch (err) {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 品牌 */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 no-underline mb-4">
            <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center text-white font-bold text-lg">
              D
            </div>
          </a>
          <h1 className="text-xl font-bold">DevPulse AI</h1>
          <p className="text-sm text-gray-400 mt-1">
            {mode === "login" ? "登录你的账号" : "创建新账号"}
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">昵称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
                placeholder="你的名字"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
              placeholder="至少6位"
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold hover:shadow-lg disabled:opacity-50 transition"
          >
            {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        {/* 切换登录/注册 */}
        <p className="text-center text-sm text-gray-400 mt-6">
          {mode === "login" ? "还没有账号？" : "已有账号？"}
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            className="text-[var(--primary)] font-medium ml-1 bg-transparent border-none cursor-pointer"
          >
            {mode === "login" ? "注册" : "登录"}
          </button>
        </p>
      </div>
    </div>
  );
}
