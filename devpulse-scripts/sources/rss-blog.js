#!/usr/bin/env node
/**
 * RSS 技术博客源适配器
 *
 * 从精选技术博客 RSS feeds 中采集最新文章
 * 输出与 daily-digest.js 兼容的条目格式
 *
 * 用法：
 *   node rss-blog.js                  # 采集所有博客
 *   node rss-blog.js --blog ruanme    # 指定博客
 */

const https = require('https');
const http = require('http');

const BLOG_FEEDS = [
  // ── 中文博客 ──
  { id: 'ruanyf', name: '阮一峰周刊', feed: 'https://www.ruanyifeng.com/blog/atom.xml', lang: 'zh' },
  { id: 'coolshell', name: '酷壳 CoolShell', feed: 'https://coolshell.cn/feed', lang: 'zh' },
  { id: 'meituan', name: '美团技术团队', feed: 'https://tech.meituan.com/feed/', lang: 'zh' },
  { id: 'bytedance', name: '字节跳动技术博客', feed: 'https://bytedance.com/atom.xml', lang: 'zh' },
  { id: 'phodal', name: 'Phodal (前端/架构)', feed: 'https://www.phodal.com/blog/atom.xml', lang: 'zh' },
  { id: 'juejin-hot', name: '稀土掘金热榜', feed: 'https://rsshub.app/juejin/trending/monthly', lang: 'zh' },

  // ── 英文博客 ──
  { id: 'dan-abramov', name: 'Dan Abramov (React)', feed: 'https://overreacted.io/atom.xml', lang: 'en' },
  { id: 'addy-osmani', name: 'Addy Osmani (Web Perf)', feed: 'https://addyosmani.com/rss.xml', lang: 'en' },
  { id: 'martinfowler', name: 'Martin Fowler', feed: 'https://martinfowler.com/feed.atom', lang: 'en' },
  { id: 'v8', name: 'V8 Blog', feed: 'https://v8.dev/blog.atom', lang: 'en' },
  { id: 'cloudflare', name: 'Cloudflare Blog', feed: 'https://blog.cloudflare.com/rss/', lang: 'en' },
  { id: 'vercel', name: 'Vercel Blog', feed: 'https://vercel.com/atom', lang: 'en' },
  { id: 'github-blog', name: 'GitHub Blog', feed: 'https://github.blog/feed/', lang: 'en' },
  { id: 'rust-blog', name: 'Rust Blog', feed: 'https://blog.rust-lang.org/feed.xml', lang: 'en' },
  { id: 'go-blog', name: 'Go Blog', feed: 'https://go.dev/blog/feed.atom', lang: 'en' },
];

const MAX_ITEMS_PER_FEED = 5;
const TIMEOUT_MS = 15000;

/**
 * 从 URL 抓取内容
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const transport = url.startsWith('https') ? https : http;
    let req;
    const timer = setTimeout(() => {
      if (req) req.destroy();
      reject(new Error(`timeout ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);

    req = transport.get(url, { headers: { 'User-Agent': 'DevPulse-AI/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timer);
        fetchUrl(res.headers.location).then(resolve, reject);
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        clearTimeout(timer);
        resolve(data);
      });
    });
    req.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

/**
 * 简易 RSS/Atom 解析（零外部依赖）
 */
function parseFeed(xml) {
  const items = [];

  // RSS 2.0: <item>...</item>
  const itemRegex = /<item[\s>][\s\S]*?<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[0];
    const title = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || '';
    const link = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() || '';
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || '';
    const desc = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim() || '';
    if (title && link) {
      items.push({ title, link, pubDate, description: desc.replace(/<[^>]+>/g, '').slice(0, 200) });
    }
  }

  // Atom: <entry>...</entry>
  if (items.length === 0) {
    const entryRegex = /<entry[\s>][\s\S]*?<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[0];
      const title = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || '';
      const link = block.match(/<link[^>]+href="([^"]+)"/i)?.[1]?.trim()
        || block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() || '';
      const pubDate = block.match(/<published>([\s\S]*?)<\/published>/i)?.[1]?.trim()
        || block.match(/<updated>([\s\S]*?)<\/updated>/i)?.[1]?.trim() || '';
      const desc = block.match(/<summary>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i)?.[1]?.trim()
        || block.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i)?.[1]?.trim() || '';
      if (title && link) {
        items.push({ title, link, pubDate, description: desc.replace(/<[^>]+>/g, '').slice(0, 200) });
      }
    }
  }

  return items;
}

/**
 * 过滤最近 7 天的文章
 */
function isRecent(pubDate) {
  if (!pubDate) return true;
  try {
    const d = new Date(pubDate);
    const now = new Date();
    return (now - d) < 7 * 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

/**
 * 采集单个博客
 */
async function fetchBlog(blog) {
  console.log(`  ${blog.name} ...`);
  try {
    const xml = await fetchUrl(blog.feed);
    const rawItems = parseFeed(xml);
    const recent = rawItems.filter(i => isRecent(i.pubDate)).slice(0, MAX_ITEMS_PER_FEED);

    const items = recent.map(entry => ({
      source: blog.name,
      category: '技术',
      sortOrder: 50,
      title: entry.title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      url: entry.link,
      subtitle: entry.description ? entry.description.slice(0, 80) : undefined,
      meta: blog.lang === 'en' ? '英文' : undefined,
    }));

    console.log(`    ✓ ${items.length} 条`);
    return items;
  } catch (e) {
    console.log(`    ✗ ${e.message}`);
    return [];
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const blogArg = args.find(a => a.startsWith('--blog'));
  const blogId = blogArg ? blogArg.split('=')[1] : null;

  const blogs = blogId
    ? BLOG_FEEDS.filter(b => b.id === blogId)
    : BLOG_FEEDS;

  console.log(`\n  RSS 博客采集 (${blogs.length} 个源)`);

  const allItems = [];
  for (const blog of blogs) {
    const items = await fetchBlog(blog);
    allItems.push(...items);
  }

  if (args.includes('--json')) {
    console.log(JSON.stringify(allItems));
  } else {
    console.log(`\n  合计: ${allItems.length} 条`);
    for (const item of allItems) {
      console.log(`    - ${item.title}`);
    }
  }

  return allItems;
}

if (require.main === module) {
  main().catch(err => {
    console.error('RSS 采集出错:', err.message);
    process.exit(1);
  });
} else {
  module.exports = { BLOG_FEEDS, fetchBlog, parseFeed, collectAll: main };
}
