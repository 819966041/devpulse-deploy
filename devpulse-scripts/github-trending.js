#!/usr/bin/env node
/**
 * GitHub Trending — 每日/每周/每月 Top 20 星标项目
 *
 * 用法：
 *   node github-trending.js            # 全部（日/周/月）
 *   node github-trending.js --daily    # 仅每日
 *   node github-trending.js --weekly   # 仅每周
 *   node github-trending.js --monthly  # 仅每月
 */

// 代理设置
if (!process.env.HTTP_PROXY && !process.env.http_proxy) {
  process.env.HTTP_PROXY = 'http://127.0.0.1:7897';
  process.env.HTTPS_PROXY = 'http://127.0.0.1:7897';
}

const fs = require('fs');
const path = require('path');
const https = require('https');

const args = process.argv.slice(2);
const showDaily = !args.length || args.includes('--daily');
const showWeekly = !args.length || args.includes('--weekly');
const showMonthly = !args.length || args.includes('--monthly');

const LIMIT = 20;
const outputDir = path.join(__dirname, '..', 'output');

/**
 * GitHub Search API 请求
 */
function searchRepos(query, sort = 'stars') {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&order=desc&per_page=${LIMIT}`;

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'opencli-digest',
        'Accept': 'application/vnd.github.v3+json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.items) {
            resolve(json.items.map((repo) => ({
              name: repo.full_name,
              description: (repo.description || '').replace(/\|/g, '\\|'),
              url: repo.html_url,
              stars: repo.stargazers_count,
              language: repo.language || '',
              forks: repo.forks_count,
            })));
          } else {
            reject(new Error(json.message || 'API error'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

/**
 * 采集对应时间范围的 trending
 * - daily:   最近 1 天创建的项目，按 stars 排序 → 今日新项目之星
 * - weekly:  最近 7 天创建的项目，按 stars 排序 → 本周新项目之星
 * - monthly: 最近 30 天创建的项目，按 stars 排序 → 本月新项目之星
 */
async function fetchTrending(since) {
  const daysMap = { daily: 1, weekly: 7, monthly: 30 };
  const sinceDate = new Date(Date.now() - daysMap[since] * 86400000).toISOString().slice(0, 10);
  return searchRepos(`created:>=${sinceDate}`, 'stars');
}

function fmtStars(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function generateMarkdown(data) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = `星期${days[new Date().getDay()]}`;

  let md = `# GitHub Trending\n\n`;
  md += `> ${dateStr} ${weekday} · 新项目星标榜 · 个人关注清单\n\n`;

  const sections = [
    { key: 'daily', label: '今日新项目 Top 20', data: data.daily },
    { key: 'weekly', label: '本周新项目 Top 20', data: data.weekly },
    { key: 'monthly', label: '本月新项目 Top 20', data: data.monthly },
  ];

  for (const section of sections) {
    if (!section.data || section.data.length === 0) continue;

    md += `---\n\n`;
    md += `### ${section.label}\n\n`;
    md += `| # | 项目 | 语言 | Stars | Forks |\n`;
    md += `|---|------|------|-------|-------|\n`;

    section.data.slice(0, LIMIT).forEach((repo, i) => {
      const desc = repo.description.length > 40
        ? repo.description.slice(0, 40) + '...'
        : repo.description;
      md += `| ${i + 1} | [${repo.name}](${repo.url})<br><small>${desc}</small> | ${repo.language || '-'} | **${fmtStars(repo.stars)}** | ${fmtStars(repo.forks)} |\n`;
    });
    md += '\n';
  }

  return md;
}

async function main() {
  console.log('\n========================================');
  console.log('  GitHub Trending 采集');
  console.log('========================================\n');

  const data = {};
  const labelMap = { daily: '今日新项目', weekly: '本周新项目', monthly: '本月新项目' };

  for (const [key, label] of Object.entries(labelMap)) {
    const shouldRun = key === 'daily' ? showDaily : key === 'weekly' ? showWeekly : showMonthly;
    if (!shouldRun) continue;

    console.log(`  ${label} ...`);
    try {
      data[key] = await fetchTrending(key);
      console.log(`    ✓ ${data[key].length} 条`);
    } catch (e) {
      console.log(`    ✗ ${e.message}`);
    }
  }

  const total = Object.values(data).flat().length;
  if (total === 0) {
    console.log('\n未采集到数据\n');
    process.exit(1);
  }

  const md = generateMarkdown(data);

  fs.mkdirSync(outputDir, { recursive: true });
  const dateStr = new Date().toISOString().slice(0, 10);
  const filePath = path.join(outputDir, `github-trending-${dateStr}.md`);
  fs.writeFileSync(filePath, md, 'utf-8');

  console.log('\n========================================');
  console.log(`  采集完成: ${total} 条`);
  console.log(`  ${filePath}\n`);
}

main().catch((err) => {
  console.error('运行出错:', err);
  process.exit(1);
});
