#!/usr/bin/env node

/**
 * 每日日报数据生成脚本
 * 用于生成最新的社区页面数据
 */

const fs = require('fs');
const path = require('path');

// 模拟数据生成函数
function generateDailyDigest() {
  const today = new Date().toISOString().split('T')[0];
  
  // 模拟从各种API获取的数据
  const digestData = {
    date: today,
    topItems: [
      {
        title: "OpenAI发布GPT-5预览版：推理能力超越人类专家",
        score: 9,
        cat: "AI/大模型",
        summary: "OpenAI发布GPT-5预览版，在复杂推理任务上表现超越人类专家，支持多模态输入和更长上下文",
        source: "HackerNews",
        tags: ["必读", "AI"]
      },
      {
        title: "React 19正式发布：并发特性全面升级",
        score: 8,
        cat: "前端框架",
        summary: "React 19正式发布，引入并发特性、Suspense改进和新的Hooks，大幅提升应用性能",
        source: "GitHub",
        tags: ["推荐", "React"]
      },
      {
        title: "苹果M4芯片性能评测：AI计算能力提升300%",
        score: 8,
        cat: "硬件",
        summary: "苹果M4芯片在AI计算性能上提升300%，神经网络引擎支持更大模型推理",
        source: "MacRumors",
        tags: ["必读", "苹果"]
      },
      {
        title: "Meta发布LLaMA 3：开源大模型新标杆",
        score: 9,
        cat: "AI/大模型",
        summary: "Meta发布LLaMA 3开源大模型，参数规模达到400B，在多个基准测试中超越闭源模型",
        source: "GitHub",
        tags: ["必读", "开源"]
      },
      {
        title: "GitHub Copilot Chat支持中文编程助手",
        score: 7,
        cat: "编程工具",
        summary: "GitHub Copilot Chat正式支持中文编程，提供智能代码补全和错误修复功能",
        source: "GitHub Blog",
        tags: ["推荐", "工具"]
      }
    ],
    githubItems: [
      {
        title: "vercel/ai",
        stars: 12800,
        desc: "Build AI-powered applications with React, Svelte, Vue, and Solid",
        lang: "TypeScript",
        color: "#3178c6"
      },
      {
        title: "anthropics/claude-code",
        stars: 9500,
        desc: "An agentic coding tool that lives in your terminal",
        lang: "TypeScript",
        color: "#3178c6"
      },
      {
        title: "langchain-ai/langchain",
        stars: 98000,
        desc: "Build context-aware reasoning applications",
        lang: "Python",
        color: "#3572A5"
      },
      {
        title: "deepseek-ai/DeepSeek-V3",
        stars: 8500,
        desc: "DeepSeek-V3: A strong Mixture-of-Experts language model",
        lang: "Python",
        color: "#3572A5"
      }
    ]
  };

  return digestData;
}

// 保存数据到文件的函数
function saveDigestData(data) {
  const dataPath = path.join(__dirname, '../data/digest.json');
  
  // 确保data目录存在
  const dataDir = path.dirname(dataPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log(`✅ 每日日报数据已保存到: ${dataPath}`);
  return dataPath;
}

// 主函数
function main() {
  try {
    console.log('🚀 开始生成每日日报数据...');
    
    // 生成数据
    const digestData = generateDailyDigest();
    
    // 保存数据
    const savedPath = saveDigestData(digestData);
    
    console.log(`📅 生成日期: ${digestData.date}`);
    console.log(`📰 今日必读 TOP ${digestData.topItems.length}:`);
    digestData.topItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.title} [${item.score}/10]`);
    });
    
    console.log(`🐙 GitHub Trending ${digestData.githubItems.length} 个:`);
    digestData.githubItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.title} ⭐${(item.stars / 1000).toFixed(1)}k`);
    });
    
    console.log('🎉 每日日报数据生成完成！');
    
    return {
      success: true,
      path: savedPath,
      data: digestData
    };
    
  } catch (error) {
    console.error('❌ 生成每日日报数据时出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { main, generateDailyDigest, saveDigestData };