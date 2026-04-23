/**
 * DevPulse AI — 产品首页（Landing Page）
 * 核心目标：30秒内让访客理解价值 → 点击注册
 */
export default function HomePage() {
  return (
    <div>
      {/* ===== Hero 区 ===== */}
      <section className="text-center py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block mb-4 px-3 py-1 bg-indigo-50 text-[var(--primary)] text-sm rounded-full font-medium">
            🤖 AI 驱动 · 每日更新 · 12+ 平台覆盖
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
            开发者的
            <span className="text-white bg-clip-text brand-gradient">
              {" "}AI 每日技术简报
            </span>
          </h1>
          <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
            自动聚合 HackerNews、微博、知乎、GitHub Trending 等 12+ 平台热点，
            AI 智能摘要 + 评分 + 分类，每天只需 3 分钟掌握行业脉搏。
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/login"
              className="px-8 py-3 bg-[var(--primary)] text-white rounded-xl text-base font-semibold no-underline hover:shadow-lg transition"
            >
              免费开始使用
            </a>
            <a
              href="/demo"
              className="px-8 py-3 border border-gray-300 rounded-xl text-base font-medium text-gray-600 no-underline hover:border-[var(--primary)] hover:text-[var(--primary)] transition"
            >
              查看示例日报 →
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-4">无需信用卡 · 免费版永久可用</p>
        </div>
      </section>

      {/* ===== 日报预览区 ===== */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base">今日必读 TOP 5</h3>
              <p className="text-xs text-gray-400">AI 从 200+ 条资讯中精选</p>
            </div>
            <span className="text-xs text-gray-400">2026-04-15 星期三</span>
          </div>
          {[
            {
              title: "斯坦福423页AI报告出炉，中美差距仅2.7%",
              score: 9,
              category: "AI/大模型",
              summary: "斯坦福发布AI指数报告，中美AI差距缩小至2.7%，清华DeepSeek冲进全球前十",
            },
            {
              title: "Claude Code Routines — AI编程工作流革命",
              score: 8,
              category: "编程工具",
              summary: "Anthropic发布Claude Code Routines，重新定义AI辅助编程工作流",
            },
            {
              title: "Orange Pi 6 Plus 评测：ARM开发新选择",
              score: 7,
              category: "硬件",
              summary: "新一代ARM单板机性能评测，开发者值得关注的硬件平台",
            },
          ].map((item, i) => (
            <div key={i} className="px-6 py-3 border-b border-gray-50 last:border-0">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-800 truncate">
                      {item.title}
                    </span>
                    <span
                      className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        item.score >= 9
                          ? "badge-must-read"
                          : item.score >= 7
                          ? "badge-recommended"
                          : "badge-worth"
                      }`}
                    >
                      {item.score >= 9 ? "必读" : "推荐"} {item.score}
                    </span>
                    <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{item.summary}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="px-6 py-3 bg-gray-50 text-center">
            <a href="/demo" className="text-sm text-[var(--primary)] font-medium no-underline">
              查看完整日报 →
            </a>
          </div>
        </div>
      </section>

      {/* ===== 功能对比区 ===== */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-3">为什么选择 DevPulse AI？</h2>
        <p className="text-center text-gray-500 mb-10">告别信息焦虑，每天 3 分钟掌握行业脉搏</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: "📡", title: "12+ 平台聚合", desc: "HackerNews、微博、知乎、B站、抖音、GitHub、Product Hunt 等一站全覆盖" },
            { icon: "🤖", title: "AI 智能筛选", desc: "AI 自动摘要、分类、评分（10分制），从 200+ 条中精选最有价值的内容" },
            { icon: "📧", title: "每日邮件推送", desc: "专业版支持邮件订阅，每天早上自动推送到你的邮箱，零操作获取资讯" },
            { icon: "🐙", title: "GitHub 深度解读", desc: "不只是 Trending 列表，AI 分析每个项目的用途、解决的问题、上榜原因" },
            { icon: "🔑", title: "API 接口", desc: "专业版提供 REST API，支持接入你的工作流、Slack、钉钉等" },
            { icon: "⚡", title: "实时更新", desc: "免费版延迟24h，专业版实时获取最新热点，抢占先机" },
          ].map((feature, i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition">
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-bold text-base mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 定价预览 ===== */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-3">简单透明的定价</h2>
        <p className="text-center text-gray-500 mb-10">早鸟价限时优惠，前100名享受终身折扣</p>
        <div className="grid md:grid-cols-3 gap-6">
          {/* 免费版 */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="font-bold text-lg mb-1">免费版</h3>
            <p className="text-gray-400 text-sm mb-4">永久免费</p>
            <div className="text-3xl font-extrabold mb-6">
              ¥0<span className="text-sm font-normal text-gray-400">/月</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              <li>✅ 延迟24h 日报</li>
              <li>✅ 5个公开平台</li>
              <li>✅ RSS 订阅</li>
              <li>❌ AI 摘要评分</li>
              <li>❌ 邮件推送</li>
              <li>❌ API 接口</li>
            </ul>
            <a href="/login" className="block text-center py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 no-underline hover:border-[var(--primary)]">
              免费开始
            </a>
          </div>
          {/* 专业版 */}
          <div className="bg-white p-6 rounded-xl border-2 border-[var(--primary)] shadow-lg relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[var(--primary)] text-white text-xs rounded-full font-semibold">
              最受欢迎
            </div>
            <h3 className="font-bold text-lg mb-1">专业版</h3>
            <p className="text-gray-400 text-sm mb-4">个人开发者首选</p>
            <div className="text-3xl font-extrabold mb-1">
              ¥29<span className="text-sm font-normal text-gray-400">/月</span>
            </div>
            <p className="text-xs text-[var(--accent)] font-semibold mb-6">🔥 早鸟价（原价 ¥49/月）</p>
            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              <li>✅ 实时日报推送</li>
              <li>✅ 12+ 全平台覆盖</li>
              <li>✅ AI 摘要 + 10分制评分</li>
              <li>✅ 每日邮件推送</li>
              <li>✅ GitHub 深度解读</li>
              <li>✅ REST API 接口</li>
              <li>✅ 30天历史数据</li>
              <li>✅ 自定义关注领域</li>
            </ul>
            <a href="/login" className="block text-center py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold no-underline hover:shadow-lg">
              立即订阅
            </a>
          </div>
          {/* 团队版 */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="font-bold text-lg mb-1">团队版</h3>
            <p className="text-gray-400 text-sm mb-4">技术团队共享</p>
            <div className="text-3xl font-extrabold mb-6">
              ¥99<span className="text-sm font-normal text-gray-400">/月</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              <li>✅ 专业版全部功能</li>
              <li>✅ 最多 10 人共享</li>
              <li>✅ 高频 API 调用</li>
              <li>✅ 全部历史数据</li>
              <li>✅ 团队协作标注</li>
              <li>✅ 优先客服支持</li>
            </ul>
            <a href="/pricing" className="block text-center py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 no-underline hover:border-[var(--primary)]">
              联系我们
            </a>
          </div>
        </div>
        <div className="text-center mt-6">
          <a href="/pricing" className="text-sm text-[var(--primary)] font-medium no-underline">
            查看完整定价对比 →
          </a>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="text-center py-16 px-4">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold mb-3">开始每天 3 分钟掌握行业脉搏</h2>
          <p className="text-gray-500 mb-6">
            加入 500+ 开发者，让 AI 帮你筛选最有价值的技术资讯
          </p>
          <a
            href="/login"
            className="inline-block px-8 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold no-underline hover:shadow-lg transition"
          >
            免费注册，立即体验 →
          </a>
        </div>
      </section>
    </div>
  );
}
