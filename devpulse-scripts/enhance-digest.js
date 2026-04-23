#!/usr/bin/env node
/**
 * AI 摘要增强 — 用 Kimi API 对原始日报进行智能加工
 *
 * 功能：
 * 1. 为每条新闻生成一句话中文摘要
 * 2. 英文内容翻译为中文
 * 3. 精细化分类（AI/商业/产品/技术/社会/娱乐等）
 * 4. 价值评分（1-5星），过滤低价值内容
 *
 * 用法：
 *   node enhance-digest.js                          # 处理今天的两份报告
 *   node enhance-digest.js --file daily-digest-xxx.md  # 处理指定文件
 */

const fs = require('fs');
const path = require('path');

const { chat: kimiChat } = require('./kimi-config');
const outputDir = path.join(__dirname, '..', 'output');

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 解析 md 文件，提取结构化条目列表
 */
function parseMdItems(md) {
  const items = [];
  const lines = md.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 匹配列表项：- [text](url) · meta
    const listMatch = line.match(/^-\s*(?:\[([^\]]*)\]\s*)?\[([^\]]+)\]\(([^)]+)\)(?:\s*·\s*(.+))?$/);
    if (listMatch) {
      items.push({
        label: listMatch[1] || '',
        title: listMatch[2],
        url: listMatch[3],
        meta: listMatch[4] || '',
        type: 'list',
      });
      continue;
    }

    // 匹配表格行：| # | [name](url)<br><small>desc</small> | lang | stars | forks |
    const tableMatch = line.match(/^\|\s*\d+\s*\|\s*\[([^\]]+)\]\(([^)]+)\)(?:<br><small>([^<]*)<\/small>)?\s*\|\s*(\S+)\s*\|\s*(\S+)\s*\|/);
    if (tableMatch && !line.match(/^\|\s*#/)) { // 跳过表头
      items.push({
        title: tableMatch[1],
        url: tableMatch[2],
        subtitle: tableMatch[3] || '',
        meta: [tableMatch[4], tableMatch[5]].filter(Boolean).join(' · '),
        type: 'table',
      });
      continue;
    }

    // 匹配 Product Hunt 子标题：> text · meta
    const subMatch = line.match(/^>\s*(.+?)(?:\s*·\s*(.+))?$/);
    if (subMatch && items.length > 0) {
      items[items.length - 1].subtitle = subMatch[1];
    }
  }

  return items;
}

/**
 * 分批处理条目（每次最多 25 条，避免超出 token）
 */
async function processBatch(items, source) {
  if (items.length === 0) return [];

  const system = `对资讯条目打分分类，输出JSON:{"items":[{"index":0,"summary":"15-30字中文摘要(说意义不复读标题)","category":"分类","value":1-10}]}
分类(8个):AI/大模型|云计算/基础设施|编程工具|前端/移动端|后端/数据库|安全/隐私|创业/融资|社会热点
评分标准:
1-3:水军/广告/纯娱乐八卦/无信息量
4-5:一般科技新闻,无直接行动价值
6-7:有信息量的行业动态,值得了解
8-9:对开发者有直接参考价值的技术/产品/工具
10:必读,行业级重大事件(如GPT发布、重大开源项目)
规则:英文标题不改,摘要加中文注解;摘要要有具体信息不要空泛
示例:{"index":0,"summary":"Anthropic发布Claude 4,代码生成SWE-bench达98%","category":"AI/大模型","value":10}
示例:{"index":1,"summary":"某公司融资A轮,金额未披露,方向为AI客服","category":"创业/融资","value":5}`;

  const userItems = items.map((item, i) => ({
    i,
    t: item.title,
    m: item.meta || '',
  }));

  const userMsg = `「${source}」${items.length}条:\n${JSON.stringify(userItems)}`;

  try {
    const result = await kimiChat(system, userMsg, true);
    const parsed = JSON.parse(result);
    return parsed.items || [];
  } catch (e) {
    console.log(`    ⚠ API 处理失败: ${e.message}`);
    return [];
  }
}

/**
 * 生成增强版 Markdown（支持多版本）
 * @param {string} source - 标题
 * @param {Array} items - 原始条目
 * @param {Array} processed - AI处理结果
 * @param {Object} options - { minScore: 5, label: '完整版' }
 */
function generateEnhancedMd(source, items, processed, options = {}) {
  const { minScore = 5, label = '' } = options;
  const dateStr = getToday();
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = `星期${days[new Date().getDay()]}`;

  // 按 category 分组，每组内按 value 降序
  const grouped = {};
  for (let i = 0; i < items.length; i++) {
    const p = processed[i];
    if (!p || p.value < minScore) continue;

    const cat = p.category || '其他';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ ...items[i], ...p });
  }

  // 排序：每组内按 value 降序
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => b.value - a.value);
  }

  // 排序分类：按最高分排序
  const sortedCats = Object.entries(grouped).sort(
    (a, b) => Math.max(...b[1].map(x => x.value)) - Math.max(...a[1].map(x => x.value))
  );

  let md = `# ${source}\n\n`;
  const labelStr = label ? ` · ${label}` : '';
  md += `> ${dateStr} ${weekday} · AI 精选${labelStr} · 价值 ≥ ${minScore} 分\n\n`;

  // 10分制评分显示
  const valueDisplay = (v) => {
    if (v >= 9) return `${v}/10 ★★★★★`;
    if (v >= 7) return `${v}/10 ★★★★☆`;
    if (v >= 5) return `${v}/10 ★★★☆☆`;
    return `${v}/10`;
  };

  for (const [cat, catItems] of sortedCats) {
    md += `## ${cat}\n\n`;

    for (const item of catItems) {
      const display = valueDisplay(item.value);
      md += `- [${item.title}](${item.url})\n`;
      md += `  > ${item.summary} · ${display}\n\n`;
    }
  }

  // 统计
  const total = sortedCats.reduce((sum, [, items]) => sum + items.length, 0);
  const mustRead = sortedCats.reduce((sum, [, items]) => sum + items.filter(i => i.value >= 8).length, 0);
  md += `---\n\n`;
  md += `*共 ${total} 条 · 必读 ${mustRead} 条（8分+）*\n`;

  return md;
}

/**
 * 处理单个报告文件
 */
async function enhanceFile(filename, label) {
  const filePath = path.join(outputDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠ ${filename} 不存在，跳过`);
    return;
  }

  console.log(`\n  处理 ${label} (${filename}) ...`);
  const md = fs.readFileSync(filePath, 'utf-8');
  let items = parseMdItems(md);
  console.log(`    解析到 ${items.length} 条`);

  if (items.length === 0) return;

  // 只处理前 80 条，后面的低排名内容价值低
  if (items.length > 80) {
    items = items.slice(0, 80);
    console.log(`    截取前 80 条处理`);
  }

  // 分批处理（每批 25 条，平衡准确率和成本）
  const BATCH = 25;
  const processed = [];
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    console.log(`    处理第 ${i + 1}-${i + batch.length} 条 ...`);
    const results = await processBatch(batch, label);
    processed.push(...results);
  }

  // 生成多版本增强报告
  const sourceName = filename.replace(/\.md$/, '').replace(/^.*-/, '');
  const versions = [
    { suffix: '-enhanced.md', minScore: 5, label: '完整版' },
    { suffix: '-selected.md', minScore: 7, label: '精选版' },
    { suffix: '-digest.md', minScore: 9, label: '摘要版' },
  ];

  for (const ver of versions) {
    const md = generateEnhancedMd(
      `${sourceName} · ${label}`,
      items,
      processed,
      { minScore: ver.minScore, label: ver.label }
    );
    const outputPath = path.join(outputDir, filename.replace('.md', ver.suffix));
    fs.writeFileSync(outputPath, md, 'utf-8');
    console.log(`    ✓ ${ver.label}: ${outputPath}`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('\n========================================');
  console.log('  AI 摘要增强');
  console.log('========================================');

  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  const specificFile = fileIdx !== -1 ? args[fileIdx + 1] : null;

  if (specificFile) {
    await enhanceFile(specificFile, '手动指定');
  } else {
    const today = getToday();

    await enhanceFile(`daily-digest-${today}.md`, '热点日报');
    await enhanceFile(`github-trending-${today}.md`, 'GitHub Trending');
  }

  console.log('\n========================================');
  console.log('  增强完成');
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('运行出错:', err);
  process.exit(1);
});
