#!/usr/bin/env node
/**
 * DevPulse AI — GitHub Pages 发布脚本
 *
 * 功能：
 * 1. 读取每日 enhanced markdown
 * 2. 生成网页版 HTML（非邮件版，用语义化 HTML + CSS）
 * 3. 更新首页索引
 * 4. 更新 RSS feed
 * 5. git commit + push
 *
 * 用法：
 *   node publish-pages.js            # 发布今天的
 *   node publish-pages.js --date 2026-04-14  # 指定日期
 */

const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'output');
const pagesDir = path.join(__dirname, '..', 'devpulse');

function getToday() { return new Date().toISOString().slice(0, 10); }

function getWeekday(dateStr) {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return `星期${days[new Date(dateStr).getDay()]}`;
}

function readReport(filename) {
  const p = path.join(outputDir, filename);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null;
}

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/**
 * 解析 GitHub Trending raw markdown
 */
function parseGithubRaw(md) {
  const repos = [];
  const lines = md.split('\n');
  let section = 'daily';
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\|\s*(\d+)\s*\|\s*\[([^\]]+)\]\(([^)]+)\)(?:<br><small>([^<]*)<\/small>)?\s*\|\s*(\S+)\s*\|\s*\*?\*?([^\*|]+)\*?\*?\s*\|\s*(\S+)\s*\|/);
    if (!m) continue;
    for (let j = i - 1; j >= 0; j--) {
      if (lines[j].match(/^###\s+今日/)) { section = 'daily'; break; }
      if (lines[j].match(/^###\s+本周/)) { section = 'weekly'; break; }
      if (lines[j].match(/^###\s+本月/)) { section = 'monthly'; break; }
    }
    repos.push({ rank: parseInt(m[1]), name: m[2], url: m[3], description: m[4] || '', language: m[5] === '-' ? '' : m[5], stars: m[6].trim(), forks: m[7]?.trim() || '', section });
  }
  return repos;
}

/**
 * 解析 enhanced markdown（github 和 digest 通用）
 */
function parseEnhanced(md) {
  const items = [];
  if (!md) return items;
  const lines = md.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const catMatch = line.match(/^## (.+)$/);
    if (catMatch) { items.push({ type: 'category', name: catMatch[1] }); continue; }
    const itemMatch = line.match(/^-\s*\[([^\]]+)\]\(([^)]+)\)/);
    if (itemMatch) {
      let summary = '', value = 5, category = '';
      if (i + 1 < lines.length) {
        const sm = lines[i + 1].match(/^>\s*(.+?)\s*[·]\s*(\d+)\/\d+/);
        if (sm) { summary = sm[1].trim(); value = parseInt(sm[2]); }
      }
      for (let j = items.length - 1; j >= 0; j--) {
        if (items[j].type === 'category') { category = items[j].name; break; }
      }
      items.push({ type: 'item', title: itemMatch[1], url: itemMatch[2], summary, value, category });
    }
  }
  return items;
}

/**
 * 读取 analysis JSON
 */
function readAnalysis(today) {
  const p = path.join(outputDir, `github-trending-${today}-analysis.json`);
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return {}; }
}

/**
 * 生成每日归档 HTML
 */
function generateDailyPage(dateStr, githubMd, githubEnhancedMd, digestMd, analysis) {
  const weekday = getWeekday(dateStr);
  const repos = parseGithubRaw(githubMd || '');
  const digestItems = parseEnhanced(digestMd);
  const langColors = { 'Python': '#3572A5', 'JavaScript': '#f1e05a', 'TypeScript': '#3178c6', 'Rust': '#dea584', 'Go': '#00ADD8', 'Java': '#b07219', 'C++': '#f34b7d', 'C#': '#178600', 'Swift': '#F05138', 'PHP': '#4F5D95', 'Shell': '#89e051', 'HTML': '#e34c26', 'Jupyter Notebook': '#DA5B0B', 'Ruby': '#701516' };
  const catColors = { 'AI/大模型': '#EF4444', '云计算/基础设施': '#3B82F6', '编程工具': '#10B981', '前端/移动端': '#8B5CF6', '后端/数据库': '#F97316', '安全/隐私': '#EAB308', '创业/融资': '#EC4899', '社会热点': '#6B7280' };

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DevPulse AI - ${dateStr}</title>
  <meta name="description" content="DevPulse AI ${dateStr} ${weekday} 技术热点精选 + GitHub Trending">
  <meta property="og:title" content="DevPulse AI ${dateStr}">
  <meta property="og:description" content="每日技术热点 + GitHub Trending AI 智能日报">
  <meta property="og:type" content="article">
  <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <div class="brand">
        <div class="logo">D</div>
        <div>
          <h1><a href="/" style="color:var(--text);text-decoration:none;">DevPulse AI</a></h1>
        </div>
      </div>
      <nav class="nav">
        <a href="/">首页</a>
        <a href="/feed.xml">RSS</a>
      </nav>
    </div>
  </header>
  <main class="container daily-page">
    <h1>${dateStr} ${weekday}</h1>
    <p class="date-info">DevPulse AI · 中文开发者 AI 技术日报</p>`;

  // GitHub Trending
  if (repos.length > 0) {
    const sections = [
      { key: 'daily', label: '今日新项目 Top 20', icon: '&#x2600;&#xFE0F;' },
      { key: 'weekly', label: '本周新项目 Top 20', icon: '&#x1F4C5;' },
      { key: 'monthly', label: '本月新项目 Top 20', icon: '&#x1F3C6;' },
    ];

    html += `<h2><span class="icon">&#x1F4BB;</span> GitHub Trending 新项目</h2>`;

    for (const sec of sections) {
      const items = repos.filter(r => r.section === sec.key);
      if (items.length === 0) continue;
      html += `<h3>${sec.icon} ${sec.label}</h3>`;

      for (const repo of items) {
        const langColor = langColors[repo.language] || '#9CA3AF';
        const deep = analysis[repo.name];
        const starsNum = parseFloat(String(repo.stars).replace(/,/g, ''));
        const isHot = starsNum >= 1000;

        html += `<div class="gh-card">
  <div class="name">
    <a href="${repo.url}" target="_blank">${esc(repo.name)}</a>
    ${repo.language ? `<span class="lang-dot" style="background:${langColor};"></span>${repo.language}` : ''}
    ${isHot ? '<span class="hot-badge">&#x1F525; 热门</span>' : ''}
    <span style="margin-left:12px;color:var(--text-muted);">&#x2605; ${esc(repo.stars)}</span>
  </div>
  <p class="desc">${esc(repo.description)}</p>`;

        if (deep) {
          html += `<div class="analysis">
  <h4>&#x2728; AI 深度分析</h4>
  <div class="row"><span class="label">用途</span>${esc(deep.purpose)}</div>
  <div class="row"><span class="label">解决</span>${esc(deep.problem)}</div>
  <div class="row"><span class="label">领域</span>${esc(deep.domain)}</div>
  <div class="row"><span class="label">上榜</span>${esc(deep.reason)}</div>
  ${deep.highlight ? `<div class="row" style="margin-top:6px;padding-top:6px;border-top:1px solid var(--secondary);"><span class="label">亮点</span><strong style="color:var(--primary);">${esc(deep.highlight)}</strong></div>` : ''}
</div>`;
        }

        html += `<div class="og-image">
  <a href="${repo.url}" target="_blank"><img src="https://opengraph.githubassets.com/1/${repo.name}" alt="${esc(repo.name)}" loading="lazy"></a>
</div></div>`;
      }
    }
  }

  // 热点资讯
  if (digestItems.length > 0) {
    html += `<h2><span class="icon">&#x1F310;</span> 热点资讯</h2>`;
    let currentCat = '';
    for (const item of digestItems) {
      if (item.type === 'category') {
        const dotColor = catColors[item.name] || '#9CA3AF';
        html += `<h3><span class="cat-dot" style="background:${dotColor};"></span>${esc(item.name)}</h3>`;
        currentCat = item.name;
        continue;
      }
      if (item.type === 'item') {
        const scoreClass = item.value >= 9 ? 'must-read' : item.value >= 7 ? 'recommended' : 'worth';
        const scoreLabel = item.value >= 9 ? '必读' : item.value >= 7 ? '推荐' : '关注';
        html += `<div class="news-item">
  <div class="title">
    <a href="${item.url}" target="_blank">${esc(item.title)}</a>
    <span class="score-badge ${scoreClass}">${scoreLabel} ${item.value}</span>
  </div>
  ${item.summary ? `<p class="summary">${esc(item.summary)}</p>` : ''}
</div>`;
      }
    }
  }

  html += `</main>
  <footer class="site-footer"><div class="container"><p>&copy; 2026 DevPulse AI</p></div></footer>
  </body></html>`;

  return html;
}

/**
 * 更新首页索引
 */
function updateIndex(recentDays) {
  let archiveHtml = '<div class="archive-grid">';
  for (const day of recentDays) {
    const weekday = getWeekday(day);
    archiveHtml += `<a href="/archives/${day}.html" class="archive-card">
  <div class="date">${day.slice(5)}</div>
  <div class="weekday">${weekday}</div>
  <div class="meta">AI 精选日报</div>
</a>`;
  }
  archiveHtml += '</div>';

  // 读取模板并替换
  const indexPath = path.join(pagesDir, 'index.html');
  let index = fs.readFileSync(indexPath, 'utf-8');
  index = index.replace(/<!-- DYNAMIC CONTENT -->/, archiveHtml);
  fs.writeFileSync(indexPath, index, 'utf-8');
}

/**
 * 生成 RSS feed
 */
function generateFeed(recentDays) {
  let items = '';
  for (const day of recentDays) {
    const weekday = getWeekday(day);
    const url = `https://yourname.github.io/devpulse/archives/${day}.html`;
    // 读取 digest enhanced 做摘要
    const digest = readReport(`daily-digest-${day}-enhanced.md`) || readReport(`daily-digest-${day}.md`);
    let desc = '';
    if (digest) {
      const parsed = parseEnhanced(digest);
      const top5 = parsed.filter(i => i.type === 'item' && i.value >= 8).slice(0, 5);
      desc = top5.map(i => `${i.title}: ${i.summary}`).join('<br>');
    }
    items += `<item>
  <title>DevPulse AI ${day}</title>
  <link>${url}</link>
  <guid isPermaLink="true">${url}</guid>
  <pubDate>${new Date(day + 'T09:00:00+08:00').toUTCString()}</pubDate>
  <description>${desc || '每日技术热点精选 + GitHub Trending'}</description>
</item>\n`;
  }

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>DevPulse AI</title>
    <link>https://yourname.github.io/devpulse/</link>
    <description>每日精选技术热点 + GitHub Trending，AI 智能筛选日报</description>
    <language>zh-CN</language>
    <atom:link href="https://yourname.github.io/devpulse/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  fs.writeFileSync(path.join(pagesDir, 'feed.xml'), feed, 'utf-8');
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const dateIdx = args.indexOf('--date');
  const today = dateIdx !== -1 ? args[dateIdx + 1] : getToday();

  console.log(`\n========================================`);
  console.log(`  DevPulse AI · Pages 发布`);
  console.log(`  日期: ${today}`);
  console.log('========================================\n');

  // 读取数据
  const githubMd = readReport(`github-trending-${today}.md`);
  const githubEnhancedMd = readReport(`github-trending-${today}-enhanced.md`);
  const digestMd = readReport(`daily-digest-${today}-enhanced.md`) || readReport(`daily-digest-${today}.md`);
  const analysis = readAnalysis(today);

  if (!githubMd && !digestMd) {
    console.log('  没有可发布的数据');
    process.exit(1);
  }

  // 1. 生成每日 HTML
  const dailyHtml = generateDailyPage(today, githubMd, githubEnhancedMd, digestMd, analysis);
  const archiveDir = path.join(pagesDir, 'archives');
  fs.mkdirSync(archiveDir, { recursive: true });
  const dailyPath = path.join(archiveDir, `${today}.html`);
  fs.writeFileSync(dailyPath, dailyHtml, 'utf-8');
  console.log(`  ✓ 每日页面: ${dailyPath}`);

  // 2. 收集最近 30 天的日期
  const recentDays = [];
  for (let d = 0; d < 30; d++) {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - d);
    const ds = dt.toISOString().slice(0, 10);
    const dayFile = path.join(archiveDir, `${ds}.html`);
    if (fs.existsSync(dayFile) || ds === today) {
      recentDays.push(ds);
    }
    if (recentDays.length >= 30) break;
  }

  // 3. 更新首页
  updateIndex(recentDays);
  console.log(`  ✓ 首页索引更新 (${recentDays.length} 天)`);

  // 4. 更新 RSS
  generateFeed(recentDays.slice(0, 30));
  console.log('  ✓ RSS feed 更新');

  console.log('\n========================================');
  console.log('  发布文件准备完成');
  console.log('  请手动执行以下命令推送到 GitHub:');
  console.log(`    cd ${pagesDir}`);
  console.log('    git add -A');
  console.log(`    git commit -m "daily: ${today}"`);
  console.log('    git push origin main');
  console.log('========================================\n');
}

main().catch(err => {
  console.error('运行出错:', err);
  process.exit(1);
});
