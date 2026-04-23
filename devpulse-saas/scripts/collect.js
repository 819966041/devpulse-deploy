#!/usr/bin/env node

/**
 * DevPulse AI — 后端采集脚本
 * 用法：node scripts/collect.js
 * 建议通过 cron 每天执行一次
 *
 * 流程：
 * 1. 从各平台采集数据
 * 2. 调用 AI API 生成摘要和评分
 * 3. 保存到数据库
 */

// 加载环境变量
const path = require("path");
const fs = require("fs");

// 尝试加载 .env 文件
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const DATABASE_URL = process.env.DATABASE_URL || "file:./prisma/dev.db";

// ========== 工具函数 ==========

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJSON(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "DevPulse-Bot/1.0",
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ========== 采集器 ==========

/**
 * HackerNews Top Stories
 */
async function collectHackerNews(limit = 30) {
  console.log("[HN] 开始采集 HackerNews...");
  try {
    const ids = await fetchJSON(
      "https://hacker-news.firebaseio.com/v0/topstories.json"
    );
    const items = [];

    for (let i = 0; i < Math.min(ids.length, limit); i++) {
      try {
        const item = await fetchJSON(
          `https://hacker-news.firebaseio.com/v0/item/${ids[i]}.json`
        );
        if (item && item.title) {
          items.push({
            title: item.title,
            url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
            source: "hackernews",
            score: item.score || 0,
            extra: {
              by: item.by,
              descendants: item.descendants || 0,
              type: item.type,
            },
          });
        }
      } catch (e) {
        console.warn(`[HN] 跳过 ${ids[i]}:`, e.message);
      }
      // 避免频率限制
      if (i % 10 === 9) await sleep(500);
    }

    console.log(`[HN] 采集完成: ${items.length} 条`);
    return items;
  } catch (err) {
    console.error("[HN] 采集失败:", err.message);
    return [];
  }
}

/**
 * GitHub Trending（通过非官方 API）
 */
async function collectGitHubTrending(limit = 25) {
  console.log("[GH] 开始采集 GitHub Trending...");
  try {
    const repos = await fetchJSON(
      "https://api.gitterapp.com/repositories?since=daily"
    );

    const items = (Array.isArray(repos) ? repos : []).slice(0, limit).map((repo) => ({
      title: `${repo.author}/${repo.name}`,
      url: repo.url || `https://github.com/${repo.author}/${repo.name}`,
      source: "github_trending",
      score: repo.currentPeriodStars || 0,
      category: repo.language || "开源项目",
      extra: {
        description: repo.description,
        language: repo.language,
        stars: repo.stars,
        forks: repo.forks,
        currentPeriodStars: repo.currentPeriodStars,
      },
    }));

    console.log(`[GH] 采集完成: ${items.length} 条`);
    return items;
  } catch (err) {
    console.error("[GH] 采集失败:", err.message);
    return [];
  }
}

/**
 * 微博热搜
 */
async function collectWeiboHot(limit = 20) {
  console.log("[WB] 开始采集微博热搜...");
  try {
    const data = await fetchJSON("https://weibo.com/ajax/side/hotSearch");
    const realtime = data?.data?.realtime || [];

    const items = realtime.slice(0, limit).map((item) => ({
      title: item.word || item.note || "",
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word || "")}`,
      source: "weibo",
      score: item.num || 0,
      extra: {
        label: item.label_name,
        category: item.category,
      },
    }));

    console.log(`[WB] 采集完成: ${items.length} 条`);
    return items.filter((i) => i.title);
  } catch (err) {
    console.error("[WB] 采集失败:", err.message);
    return [];
  }
}

/**
 * Product Hunt 今日热门
 */
async function collectProductHunt(limit = 15) {
  console.log("[PH] 开始采集 Product Hunt...");
  // Product Hunt 需要 API Token，这里用简化方案（RSS 或公开页面）
  // 实际生产中应使用 GraphQL API
  try {
    // 简化方案：通过公开的 API 获取
    const res = await fetch("https://www.producthunt.com/feed", {
      headers: { Accept: "application/xml" },
    });
    // 此处仅做占位，实际需要 XML 解析
    console.log(`[PH] 采集完成: 0 条（需要 API Token）`);
    return [];
  } catch (err) {
    console.error("[PH] 采集失败:", err.message);
    return [];
  }
}

// ========== AI 增强（摘要 + 评分） ==========

/**
 * 调用 GLM API 生成摘要和评分
 */
async function enhanceWithAI(items) {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) {
    console.log("[AI] 未配置 GLM_API_KEY，跳过 AI 增强");
    return items;
  }

  console.log(`[AI] 开始 AI 增强，共 ${items.length} 条...`);
  const batchSize = 10;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const titles = batch.map((item, idx) => `${idx + 1}. ${item.title}`).join("\n");

    try {
      const res = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "glm-4-flash",
          messages: [
            {
              role: "system",
              content: `你是技术资讯分析助手。对每条资讯给出：
1. 一句话中文摘要（30字以内）
2. 相关度评分（1-10，10为最值得关注）
3. 分类标签（AI/大模型 | 编程工具 | 前端 | 后端 | 硬件 | 开源项目 | 其他）

以 JSON 数组格式返回，每个元素格式：
{"summary": "...", "aiScore": N, "category": "..."}`,
            },
            {
              role: "user",
              content: titles,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "[]";

      // 提取 JSON
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const scores = JSON.parse(jsonMatch[0]);
        batch.forEach((item, idx) => {
          if (scores[idx]) {
            item.summary = scores[idx].summary || "";
            item.aiScore = scores[idx].aiScore || 5;
            if (scores[idx].category) {
              item.category = scores[idx].category;
            }
          }
        });
      }

      console.log(`[AI] 批次 ${Math.floor(i / batchSize) + 1} 完成`);
    } catch (err) {
      console.error(`[AI] 批次 ${Math.floor(i / batchSize) + 1} 失败:`, err.message);
    }

    await sleep(1000); // 避免 API 频率限制
  }

  return items;
}

// ========== 数据库操作（使用 SQLite3 直接操作） ==========

async function saveReport(date, type, data) {
  // 使用 Prisma 的方式（通过子进程调用）
  // 简化方案：直接使用 better-sqlite3 或写入 JSON 文件
  const dbPath = path.resolve(__dirname, "../prisma/dev.db");
  const outputPath = path.resolve(__dirname, `../data/${date}_${type}.json`);

  // 确保 data 目录存在
  const dataDir = path.resolve(__dirname, "../data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 写入 JSON 文件（备用方案）
  const reportData = {
    date,
    type,
    data: JSON.stringify(data),
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2), "utf-8");
  console.log(`[DB] 已保存到 ${outputPath}`);

  // 提示：实际生产中应通过 Prisma 写入数据库
  // 可以调用 npm run db:push 后使用 Prisma Client
  console.log(`[DB] 提示：如需写入数据库，请通过 Next.js API 调用 /api/reports`);

  return reportData;
}

// ========== 主流程 ==========

async function main() {
  const now = new Date();
  // 使用中国时区
  const cnTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const date = cnTime.toISOString().split("T")[0];

  console.log("=".repeat(50));
  console.log(`DevPulse AI 采集任务 - ${date}`);
  console.log("=".repeat(50));

  // 1. 并发采集各平台
  console.log("\n📡 阶段 1: 数据采集");
  const [hnItems, ghItems, weiboItems, phItems] = await Promise.all([
    collectHackerNews(),
    collectGitHubTrending(),
    collectWeiboHot(),
    collectProductHunt(),
  ]);

  let allItems = [...hnItems, ...ghItems, ...weiboItems, ...phItems];
  console.log(`\n📊 采集汇总: ${allItems.length} 条`);
  console.log(
    `   平台: ${[...new Set(allItems.map((i) => i.source))].join(", ")}`
  );

  // 2. AI 增强
  console.log("\n🤖 阶段 2: AI 增强");
  allItems = await enhanceWithAI(allItems);

  // 3. 按评分排序
  allItems.sort((a, b) => (b.aiScore || b.score || 0) - (a.aiScore || a.score || 0));

  // 4. 生成日报数据
  const reportData = {
    date,
    items: allItems,
    generatedAt: new Date().toISOString(),
    summary: `${date} 共采集 ${allItems.length} 条资讯，来自 ${new Set(allItems.map((i) => i.source)).size} 个平台。评分最高的内容：${allItems[0]?.title || "暂无"}`,
  };

  // 5. 保存综合日报
  console.log("\n💾 阶段 3: 数据保存");
  await saveReport(date, "DIGEST", reportData);

  // 6. 单独保存 GitHub Trending
  if (ghItems.length > 0) {
    await saveReport(date, "GITHUB_TRENDING", {
      date,
      items: ghItems,
      generatedAt: new Date().toISOString(),
      summary: `GitHub Trending 今日 ${ghItems.length} 个热门项目`,
    });
  }

  // 7. 输出 Top 10
  console.log("\n" + "=".repeat(50));
  console.log(`📰 今日必读 TOP 10 (${date})`);
  console.log("=".repeat(50));
  allItems.slice(0, 10).forEach((item, i) => {
    const score = item.aiScore ? ` [${item.aiScore}/10]` : "";
    const source = item.source ? ` (${item.source})` : "";
    console.log(`  ${i + 1}. ${item.title}${score}${source}`);
    if (item.summary) {
      console.log(`     → ${item.summary}`);
    }
  });

  console.log("\n✅ 采集任务完成！");
}

// 执行
main().catch((err) => {
  console.error("❌ 采集任务失败:", err);
  process.exit(1);
});
