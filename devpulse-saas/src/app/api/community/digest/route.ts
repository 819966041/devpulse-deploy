import { NextResponse } from 'next/server';

// 模拟数据库中的日报数据
const digestDatabase = [
  {
    id: 1,
    title: "OpenAI发布GPT-5预览版：推理能力超越人类专家",
    score: 9,
    category: "AI/大模型",
    summary: "OpenAI发布GPT-5预览版，在复杂推理任务上表现超越人类专家，支持多模态输入和更长上下文",
    source: "HackerNews",
    date: "2026-04-20",
    tags: ["必读", "AI"],
    url: "https://news.ycombinator.com/item?id=123456"
  },
  {
    id: 2,
    title: "React 19正式发布：并发特性全面升级",
    score: 8,
    category: "前端框架",
    summary: "React 19正式发布，引入并发特性、Suspense改进和新的Hooks，大幅提升应用性能",
    source: "GitHub",
    date: "2026-04-20",
    tags: ["推荐", "React"],
    url: "https://github.com/facebook/react/releases/tag/v19.0.0"
  },
  {
    id: 3,
    title: "苹果M4芯片性能评测：AI计算能力提升300%",
    score: 8,
    category: "硬件",
    summary: "苹果M4芯片在AI计算性能上提升300%，神经网络引擎支持更大模型推理",
    source: "MacRumors",
    date: "2026-04-20",
    tags: ["必读", "苹果"],
    url: "https://www.macrumors.com/2026/04/20/m4-chip-benchmark/"
  },
  {
    id: 4,
    title: "Meta发布LLaMA 3：开源大模型新标杆",
    score: 9,
    category: "AI/大模型",
    summary: "Meta发布LLaMA 3开源大模型，参数规模达到400B，在多个基准测试中超越闭源模型",
    source: "GitHub",
    date: "2026-04-20",
    tags: ["必读", "开源"],
    url: "https://github.com/meta-llama/llama3"
  },
  {
    id: 5,
    title: "GitHub Copilot Chat支持中文编程助手",
    score: 7,
    category: "编程工具",
    summary: "GitHub Copilot Chat正式支持中文编程，提供智能代码补全和错误修复功能",
    source: "GitHub Blog",
    date: "2026-04-20",
    tags: ["推荐", "工具"],
    url: "https://github.blog/2026-04-20/github-copilot-chat-chinese/"
  }
];

// GitHub Trending 数据
const githubTrending = [
  {
    title: "vercel/ai",
    stars: 12800,
    description: "Build AI-powered applications with React, Svelte, Vue, and Solid",
    language: "TypeScript",
    color: "#3178c6",
    url: "https://github.com/vercel/ai"
  },
  {
    title: "anthropics/claude-code",
    stars: 9500,
    description: "An agentic coding tool that lives in your terminal",
    language: "TypeScript",
    color: "#3178c6",
    url: "https://github.com/anthropics/claude-code"
  },
  {
    title: "langchain-ai/langchain",
    stars: 98000,
    description: "Build context-aware reasoning applications",
    language: "Python",
    color: "#3572A5",
    url: "https://github.com/langchain-ai/langchain"
  },
  {
    title: "deepseek-ai/DeepSeek-V3",
    stars: 8500,
    description: "DeepSeek-V3: A strong Mixture-of-Experts language model",
    language: "Python",
    color: "#3572A5",
    url: "https://github.com/deepseek-ai/DeepSeek-V3"
  }
];

export async function GET() {
  try {
    // 获取当前日期
    const today = new Date().toISOString().split('T')[0];
    
    // 模拟从数据库获取数据
    const topItems = digestDatabase.map(item => ({
      title: item.title,
      score: item.score,
      cat: item.category,
      summary: item.summary,
      source: item.source,
      tags: item.tags,
      url: item.url
    }));

    const githubItems = githubTrending.map(repo => ({
      title: repo.title,
      stars: repo.stars,
      description: repo.description,
      language: repo.language,
      color: repo.color,
      url: repo.url
    }));

    return NextResponse.json({
      success: true,
      data: {
        date: today,
        topItems,
        githubItems
      }
    });
  } catch (error) {
    console.error('Error fetching digest data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch digest data' },
      { status: 500 }
    );
  }
}