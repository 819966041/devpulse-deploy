/**
 * DevPulse AI — 采集引擎适配器
 * 聚合 12+ 平台数据，供 API / scripts/collect.js 调用
 */
import prisma from "./prisma";

// ========== 类型定义 ==========
export interface RawItem {
  title: string;
  url: string;
  source: string;           // 平台名称：hackernews / weibo / zhihu / github 等
  score?: number;           // 原始热度
  category?: string;        // AI/大模型 | 编程工具 | 硬件 | 前端 | 后端 ...
  summary?: string;         // AI 生成的摘要
  aiScore?: number;         // AI 评分 1-10
  extra?: Record<string, unknown>; // 扩展字段
}

export interface DailyReportData {
  date: string;             // YYYY-MM-DD
  items: RawItem[];
  generatedAt: string;      // ISO timestamp
  summary: string;          // AI 生成的当日总结
}

export type ReportType = "DIGEST" | "GITHUB_TRENDING" | "OVERSEAS_DEEP";

// ========== 平台采集器（纯函数，方便测试） ==========

/**
 * HackerNews Top Stories
 */
export async function fetchHackerNews(limit = 30): Promise<RawItem[]> {
  try {
    const topRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
    const ids: number[] = await topRes.json();

    const items = await Promise.all(
      ids.slice(0, limit).map(async (id) => {
        const item = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((r) => r.json());
        return {
          title: item.title || "",
          url: item.url || `https://news.ycombinator.com/item?id=${id}`,
          source: "hackernews",
          score: item.score || 0,
          extra: { by: item.by, descendants: item.descendants },
        } satisfies RawItem;
      })
    );

    return items.filter((i) => i.title);
  } catch (err) {
    console.error("[collect] HackerNews fetch failed:", err);
    return [];
  }
}

/**
 * GitHub Trending（通过非官方 API）
 */
export async function fetchGitHubTrending(limit = 25): Promise<RawItem[]> {
  try {
    const res = await fetch("https://api.gitterapp.com/repositories?since=daily", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const repos = await res.json();
    return (repos as Record<string, unknown>[]).slice(0, limit).map((repo) => ({
      title: `${repo.author}/${repo.name}` as string,
      url: repo.url as string,
      source: "github_trending",
      score: (repo.currentPeriodStars as number) || 0,
      category: (repo.language as string) || "开源项目",
      extra: {
        description: repo.description,
        language: repo.language,
        stars: repo.stars,
        forks: repo.forks,
        currentPeriodStars: repo.currentPeriodStars,
      },
    }));
  } catch (err) {
    console.error("[collect] GitHub Trending fetch failed:", err);
    return [];
  }
}

/**
 * 微博热搜（通过公开接口）
 */
export async function fetchWeiboHot(limit = 20): Promise<RawItem[]> {
  try {
    const res = await fetch("https://weibo.com/ajax/side/hotSearch");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const realtime = data?.data?.realtime || [];
    return realtime.slice(0, limit).map((item: Record<string, unknown>) => ({
      title: item.word as string,
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word as string)}`,
      source: "weibo",
      score: (item.num as number) || 0,
      extra: { label: item.label_name, category: item.category },
    }));
  } catch (err) {
    console.error("[collect] Weibo fetch failed:", err);
    return [];
  }
}

/**
 * 知乎热榜
 */
export async function fetchZhihuHot(limit = 20): Promise<RawItem[]> {
  try {
    const res = await fetch("https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return (data.data || []).slice(0, limit).map((item: Record<string, unknown>) => ({
      title: (item.target as Record<string, unknown>)?.title as string,
      url: (item.target as Record<string, unknown>)?.url as string,
      source: "zhihu",
      score: (item.detail_text ? parseInt(item.detail_text as string, 10) : 0) || 0,
    }));
  } catch (err) {
    console.error("[collect] Zhihu fetch failed:", err);
    return [];
  }
}

// ========== 持久化 ==========

/**
 * 保存日报到数据库（upsert by date + type）
 */
export async function saveDailyReport(
  date: string,
  type: ReportType,
  data: DailyReportData
) {
  return prisma.dailyReport.upsert({
    where: { date_type: { date, type } },
    create: { date, type, data: JSON.stringify(data) },
    update: { data: JSON.stringify(data) },
  });
}

/**
 * 读取日报
 */
export async function getDailyReport(date: string, type: ReportType) {
  const report = await prisma.dailyReport.findUnique({
    where: { date_type: { date, type } },
  });
  if (!report) return null;
  return JSON.parse(report.data) as DailyReportData;
}

/**
 * 获取最近 N 天的日报
 */
export async function getRecentReports(type: ReportType, days = 7) {
  const reports = await prisma.dailyReport.findMany({
    where: { type },
    orderBy: { date: "desc" },
    take: days,
  });
  return reports.map((r) => ({
    ...r,
    data: JSON.parse(r.data) as DailyReportData,
  }));
}

// ========== 全量采集入口 ==========

/**
 * 执行一次完整采集流程
 * 供 API / scripts/collect.js 调用
 */
export async function runCollection() {
  const now = new Date();
  const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const generatedAt = now.toISOString();

  console.log(`[collect] 开始采集 ${date} ...`);

  // 并发采集各平台
  const [hnItems, ghItems, weiboItems, zhihuItems] = await Promise.all([
    fetchHackerNews(),
    fetchGitHubTrending(),
    fetchWeiboHot(),
    fetchZhihuHot(),
  ]);

  const allItems = [...hnItems, ...ghItems, ...weiboItems, ...zhihuItems];
  console.log(`[collect] 采集完成，共 ${allItems.length} 条`);

  // 构建日报数据
  const reportData: DailyReportData = {
    date,
    items: allItems,
    generatedAt,
    summary: `${date} 共采集 ${allItems.length} 条资讯，来自 ${new Set(allItems.map((i) => i.source)).size} 个平台。`,
  };

  // 保存综合日报
  await saveDailyReport(date, "DIGEST", reportData);

  // 单独保存 GitHub Trending
  if (ghItems.length > 0) {
    await saveDailyReport(date, "GITHUB_TRENDING", {
      date,
      items: ghItems,
      generatedAt,
      summary: `GitHub Trending 今日 ${ghItems.length} 个热门项目`,
    });
  }

  console.log(`[collect] ${date} 日报已保存`);
  return reportData;
}
