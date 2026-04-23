/**
 * 示例日报页 — 公开引流
 * 不需要登录，展示静态模拟数据
 */
export default function DemoPage() {
  const today = "2026-04-15";

  const topItems = [
    { title: "斯坦福423页AI报告出炉，中美差距仅2.7%", score: 9, cat: "AI/大模型", summary: "斯坦福发布AI指数报告，中美AI差距缩小至2.7%，清华DeepSeek冲进全球前十", source: "hackernews" },
    { title: "Claude Code Routines — AI编程工作流革命", score: 8, cat: "编程工具", summary: "Anthropic发布Claude Code Routines，重新定义AI辅助编程工作流", source: "hackernews" },
    { title: "Orange Pi 6 Plus 评测：ARM开发新选择", score: 7, cat: "硬件", summary: "新一代ARM单板机性能评测，开发者值得关注的硬件平台", source: "zhihu" },
    { title: "全球AI芯片被一家味精厂卡脖子？份额超95%", score: 7, cat: "硬件", summary: "全球AI芯片关键材料被一家日本味精厂垄断，份额超95%", source: "weibo" },
    { title: "Building Privacy-First Voice AI Agent with Local LLMs", score: 8, cat: "AI/大模型", summary: "构建隐私优先的本地LLM语音控制AI代理的技术实践", source: "hackernews" },
  ];

  const githubItems = [
    { title: "vercel/ai", stars: 12800, desc: "Build AI-powered applications with React, Svelte, Vue, and Solid", lang: "TypeScript" },
    { title: "anthropics/claude-code", stars: 9500, desc: "An agentic coding tool that lives in your terminal", lang: "TypeScript" },
    { title: "langchain-ai/langchain", stars: 98000, desc: "Build context-aware reasoning applications", lang: "Python" },
    { title: "deepseek-ai/DeepSeek-V3", stars: 8500, desc: "DeepSeek-V3: A strong Mixture-of-Experts language model", lang: "Python" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 标题 */}
      <div className="text-center mb-8">
        <div className="inline-block mb-3 px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full font-medium">
          📢 公开预览 · 无需注册
        </div>
        <h1 className="text-2xl font-bold mb-2">DevPulse AI 日报示例</h1>
        <p className="text-sm text-gray-400">
          以下是 AI 自动生成的技术日报预览，注册后可获取完整内容 + 实时更新
        </p>
      </div>

      {/* TOP 5 必读 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base">🔥 今日必读 TOP 5</h2>
            <p className="text-xs text-gray-400">AI 从 200+ 条资讯中精选</p>
          </div>
          <span className="text-xs text-gray-400">{today}</span>
        </div>
        {topItems.map((item, i) => (
          <div key={i} className="px-6 py-3 border-b border-gray-50 last:border-0">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-bold">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-gray-800">{item.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${item.score >= 9 ? "badge-must-read" : "badge-recommended"}`}>
                    {item.score >= 9 ? "必读" : "推荐"} {item.score}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{item.cat}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{item.summary}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* GitHub Trending */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-base">🐙 GitHub Trending 精选</h2>
          <p className="text-xs text-gray-400">AI 深度解读热门开源项目</p>
        </div>
        {githubItems.map((repo, i) => (
          <div key={i} className="px-6 py-4 border-b border-gray-50 last:border-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-[var(--primary)]">{repo.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{repo.lang}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{repo.desc}</p>
              </div>
              <div className="flex-shrink-0 text-sm text-gray-400">
                ⭐ {(repo.stars / 1000).toFixed(1)}k
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8 text-center">
        <h3 className="text-lg font-bold mb-2">想要获取完整日报？</h3>
        <p className="text-sm text-gray-500 mb-4">
          注册后获取 200+ 条多平台实时资讯 + AI 摘要评分 + 邮件推送
        </p>
        <div className="flex gap-3 justify-center">
          <a
            href="/login"
            className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold no-underline hover:shadow-lg"
          >
            免费注册 →
          </a>
          <a
            href="/pricing"
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 no-underline hover:border-[var(--primary)]"
          >
            查看定价
          </a>
        </div>
      </div>
    </div>
  );
}
