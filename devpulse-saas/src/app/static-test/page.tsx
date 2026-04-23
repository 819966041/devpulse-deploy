/**
 * 静态测试页面 - 不使用任何客户端JavaScript
 */
export default function StaticTestPage() {
  // 静态数据
  const today = "2026-04-20";
  const topItems = [
    {
      title: "OpenAI发布GPT-5预览版：推理能力超越人类专家",
      score: 9,
      cat: "AI/大模型",
      summary: "OpenAI发布GPT-5预览版，在复杂推理任务上表现超越人类专家，支持多模态输入和更长上下文",
      source: "HackerNews",
    },
    {
      title: "React 19正式发布：并发特性全面升级",
      score: 8,
      cat: "前端框架",
      summary: "React 19正式发布，引入并发特性、Suspense改进和新的Hooks，大幅提升应用性能",
      source: "GitHub",
    },
    {
      title: "苹果M4芯片性能评测：AI计算能力提升300%",
      score: 8,
      cat: "硬件",
      summary: "苹果M4芯片在AI计算性能上提升300%，神经网络引擎支持更大模型推理",
      source: "MacRumors",
    },
    {
      title: "Meta发布LLaMA 3：开源大模型新标杆",
      score: 9,
      cat: "AI/大模型",
      summary: "Meta发布LLaMA 3开源大模型，参数规模达到400B，在多个基准测试中超越闭源模型",
      source: "GitHub",
    },
    {
      title: "GitHub Copilot Chat支持中文编程助手",
      score: 7,
      cat: "编程工具",
      summary: "GitHub Copilot Chat正式支持中文编程，提供智能代码补全和错误修复功能",
      source: "GitHub Blog",
    }
  ];

  const githubItems = [
    {
      title: "vercel/ai",
      stars: 12800,
      desc: "Build AI-powered applications with React, Svelte, Vue, and Solid",
      lang: "TypeScript",
    },
    {
      title: "anthropics/claude-code",
      stars: 9500,
      desc: "An agentic coding tool that lives in your terminal",
      lang: "TypeScript",
    },
    {
      title: "langchain-ai/langchain",
      stars: 98000,
      desc: "Build context-aware reasoning applications",
      lang: "Python",
    },
    {
      title: "deepseek-ai/DeepSeek-V3",
      stars: 8500,
      desc: "DeepSeek-V3: A strong Mixture-of-Experts language model",
      lang: "Python",
    }
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">静态测试页面</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📅 当前日期</h2>
          <p className="text-lg">{today}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🔥 今日必读 TOP {topItems.length}</h2>
          <div className="space-y-4">
            {topItems.map((item, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-gray-600 mb-1">{item.summary}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    评分: {item.score}/10
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                    {item.cat}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                    来源: {item.source}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">🐙 GitHub Trending ({githubItems.length})</h2>
          <div className="space-y-4">
            {githubItems.map((repo, index) => (
              <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                <h3 className="font-semibold text-lg">{repo.title}</h3>
                <p className="text-gray-600 mb-1">{repo.desc}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                    ⭐ {(repo.stars / 1000).toFixed(1)}k
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                    {repo.lang}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}