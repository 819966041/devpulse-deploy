#!/usr/bin/env node
/**
 * GitHub Trending 深度分析 — AI 分析每个项目的用途、解决的问题、领域、上榜原因
 *
 * 用法：
 *   node github-analysis.js                        # 分析今天的报告
 */

const fs = require('fs');
const path = require('path');

const { chat: kimiChat } = require('./kimi-config');
const outputDir = path.join(__dirname, '..', 'output');

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 解析原始 GitHub Trending markdown
 */
function parseRepos(md) {
  const repos = [];
  const lines = md.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\|\s*\d+\s*\|\s*\[([^\]]+)\]\(([^)]+)\)(?:<br><small>([^<]*)<\/small>)?\s*\|\s*(\S+)\s*\|\s*\*?\*?([^\*|]+)\*?\*?\s*\|\s*(\S+)\s*\|/);
    if (!m) continue;

    repos.push({
      name: m[1],
      description: m[3] || '',
      language: m[4] === '-' ? '' : m[4],
      stars: m[5].trim(),
    });
  }

  return repos;
}

/**
 * 分批分析项目
 */
async function analyzeBatch(repos) {
  const system = `你是资深开源项目分析师。对每个GitHub项目输出JSON:{"items":[{"name":"完整仓库名(owner/repo)","purpose":"核心用途(30-50字,具体说明功能和能力)","problem":"解决的问题(30-50字,描述痛点和场景)","domain":"所属领域(2-6字)","reason":"上榜原因(30-50字,结合技术趋势和社区热度)","highlight":"最大亮点(20-30字,一句话说清最吸引人的点)"}]}
规则:基于项目名和描述推断,不编造;name必须包含owner/前缀,和输入完全一致;每个字段都要有实质内容,不要写空泛的套话;purpose要具体到技术实现层面;problem要描述真实使用场景;reason要提到具体数据(星标数、增长速度)或技术趋势;highlight要提炼出区别于同类项目的核心卖点`;

  const userItems = repos.map(r => ({
    n: r.name,
    d: r.description,
    s: r.stars,
    l: r.language,
  }));

  const userMsg = `${repos.length}个项目:\n${JSON.stringify(userItems)}`;

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await kimiChat(system, userMsg);
      const parsed = JSON.parse(result);
      if (parsed.items && parsed.items.length > 0) {
        return parsed.items;
      }
      console.log(`    ⚠ 第 ${attempt}/${MAX_RETRIES} 次返回空结果，重试中...`);
    } catch (e) {
      console.log(`    ⚠ 第 ${attempt}/${MAX_RETRIES} 次失败: ${e.message}`);
    }
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  throw new Error(`GitHub 分析连续 ${MAX_RETRIES} 次失败，本批 ${repos.length} 个项目未处理`);
}

async function main() {
  console.log('\n========================================');
  console.log('  GitHub Trending 深度分析');
  console.log('========================================\n');

  const today = getToday();
  const rawPath = path.join(outputDir, `github-trending-${today}.md`);

  if (!fs.existsSync(rawPath)) {
    console.log(`  ⚠ 原始文件不存在: ${rawPath}`);
    process.exit(1);
  }

  const md = fs.readFileSync(rawPath, 'utf-8');
  const repos = parseRepos(md);
  console.log(`  解析到 ${repos.length} 个项目\n`);

  const BATCH = 5;
  const CONCURRENCY = 1;
  const analysis = {};

  // 构建所有批次
  const batches = [];
  for (let i = 0; i < repos.length; i += BATCH) {
    batches.push({ slice: repos.slice(i, i + BATCH), start: i });
  }

  // 并发执行，最多 CONCURRENCY 路同时，每轮之间间隔 2 秒
  for (let g = 0; g < batches.length; g += CONCURRENCY) {
    const group = batches.slice(g, g + CONCURRENCY);
    const promises = group.map(b => {
      console.log(`  分析第 ${b.start + 1}-${b.start + b.slice.length} 个 ...`);
      return analyzeBatch(b.slice).then(results => ({ batch: b, results }));
    });

    const settled = await Promise.all(promises);

    // 每轮结束后等待 3 秒，避免触发限速
    if (g + CONCURRENCY < batches.length) {
      await new Promise(r => setTimeout(r, 3000));
    }

    for (const { batch, results } of settled) {
      for (const item of results) {
        if (item.name) {
          let fullName = item.name;
          if (!fullName.includes('/')) {
            const match = batch.slice.find(r => r.name.endsWith('/' + fullName));
            if (match) fullName = match.name;
          }
          if (fullName) {
            analysis[fullName] = {
              purpose: item.purpose || '',
              problem: item.problem || '',
              domain: item.domain || '',
              reason: item.reason || '',
              highlight: item.highlight || '',
            };
          }
        }
      }
    }
  }

  const analysisPath = path.join(outputDir, `github-trending-${today}-analysis.json`);
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2), 'utf-8');
  console.log(`\n  ✓ 分析完成: ${analysisPath}`);
  console.log(`  共 ${Object.keys(analysis).length} 个项目\n`);
}

main().catch(err => {
  console.error('运行出错:', err);
  process.exit(1);
});
