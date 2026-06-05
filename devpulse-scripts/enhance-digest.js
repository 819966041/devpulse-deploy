#!/usr/bin/env node
/**
 * AI 摘要增强 — 三维评分 + 关键词标签 + 趋势 Highlights
 *
 * 功能：
 * 1. 三维评分：relevance(相关性) + quality(质量) + timeliness(时效性)，各 1-10，总分 30
 * 2. 统一 8 类分类 + 每条 2-3 个关键词标签
 * 3. 15-30 字中文摘要（说意义不复读标题）
 * 4. 当日趋势 Highlights（200-300 字宏观趋势总结）
 *
 * 输出三档：enhanced(≥15) / selected(≥21) / digest(≥27)
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
 * 三维评分：relevance + quality + timeliness，各 1-10，总分 30
 */
async function processBatch(items, source, isLastBatch) {
  if (items.length === 0) return { items: [], highlights: '' };

  const system = `对资讯条目进行三维评分、分类、提取关键词，并生成趋势总结。输出JSON:
{"items":[{"index":0,"summary":"15-30字中文摘要(说意义不复读标题)","category":"分类","tags":["标签1","标签2"],"relevance":1-10,"quality":1-10,"timeliness":1-10}],"highlights":"200-300字当日宏观趋势总结(仅最后一批返回)"}

分类(8个):AI/大模型|云计算/基础设施|编程工具|前端/移动端|后端/数据库|安全/隐私|创业/融资|社会热点

三维评分标准:
relevance(相关性): 1-2无关 → 5-6有关联 → 9-10核心技术话题
quality(质量):     1-2标题党/广告 → 5-6有深度 → 9-10权威原创/一手信源
timeliness(时效):  1-2过时内容 → 5-6有参考价值 → 9-10突发/首次报道

关键词规则: 每条提取2-3个具体技术名词/产品名/事件名(不要泛词如"科技""发展")

趋势总结规则: 总结当日技术圈核心动向、重点关注方向、值得追踪的变化(仅最后一批需要生成highlights字段)

规则: 英文标题不改,摘要加中文注解;摘要要有具体信息不要空泛
示例:{"index":0,"summary":"Anthropic发布Claude 4,代码生成SWE-bench达98%","category":"AI/大模型","tags":["Claude 4","SWE-bench","Anthropic"],"relevance":10,"quality":9,"timeliness":10}`;

  const userItems = items.map((item, i) => ({
    i,
    t: item.title,
    m: item.meta || '',
  }));

  const batchHint = isLastBatch ? '\n\n(这是最后一批，请生成highlights趋势总结)' : '\n\n(这不是最后一批，highlights留空字符串即可)';
  const userMsg = `「${source}」${items.length}条:\n${JSON.stringify(userItems)}${batchHint}`;

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await kimiChat(system, userMsg, true);
      const parsed = JSON.parse(result);
      if (parsed.items && parsed.items.length > 0) {
        return {
          items: parsed.items || [],
          highlights: parsed.highlights || '',
        };
      }
      // AI 返回了空结果，视为失败
      console.log(`    ⚠ 第 ${attempt}/${MAX_RETRIES} 次返回空结果，重试中...`);
    } catch (e) {
      console.log(`    ⚠ 第 ${attempt}/${MAX_RETRIES} 次失败: ${e.message}`);
    }
    if (attempt < MAX_RETRIES) {
      // 等待 5 秒后重试，避免立即触发限流
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  // 所有重试都失败，抛出错误让调用方知道
  throw new Error(`AI 增强连续 ${MAX_RETRIES} 次失败，本批 ${items.length} 条数据未处理`);
}

/**
 * 计算三维总分（向下兼容旧数据：旧 value×3）
 */
function totalScore(p) {
  if (p.relevance != null && p.quality != null && p.timeliness != null) {
    return p.relevance + p.quality + p.timeliness;
  }
  return (p.value || 0) * 3;
}

/**
 * 三维评分显示（总分 + 维度小字）
 */
function scoreDisplay(p) {
  const total = totalScore(p);
  const stars = total >= 27 ? '★★★★★' : total >= 21 ? '★★★★☆' : total >= 15 ? '★★★☆☆' : '★★☆☆☆';
  if (p.relevance != null) {
    return `${total}/30 ${stars} (相关${p.relevance}·质量${p.quality}·时效${p.timeliness})`;
  }
  return `${total}/30 ${stars}`;
}

/**
 * 生成增强版 Markdown（三维评分 + 关键词 + 趋势 Highlights）
 * @param {string} source - 标题
 * @param {Array} items - 原始条目
 * @param {Array} processed - AI处理结果
 * @param {string} highlights - 趋势总结
 * @param {Object} options - { minScore: 15, label: '完整版' }
 */
function generateEnhancedMd(source, items, processed, highlights, options = {}) {
  const { minScore = 15, label = '' } = options;
  const dateStr = getToday();
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = `星期${days[new Date().getDay()]}`;

  // 按 category 分组，每组内按总分降序
  // 用 AI 返回的 index 字段做映射，避免乱序导致张冠李戴
  const processedMap = {};
  for (const p of processed) {
    if (p.index != null) processedMap[p.index] = p;
  }

  const grouped = {};
  for (let i = 0; i < items.length; i++) {
    const p = processedMap[i] || processed[i]; // 优先用 index 映射，兼容旧数据
    if (!p) continue;
    const score = totalScore(p);
    if (score < minScore) continue;

    const cat = p.category || '其他';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ ...items[i], ...p, _total: score });
  }

  // 每组内按总分降序
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => b._total - a._total);
  }

  // 分类按最高分排序
  const sortedCats = Object.entries(grouped).sort(
    (a, b) => Math.max(...b[1].map(x => x._total)) - Math.max(...a[1].map(x => x._total))
  );

  let md = `# ${source}\n\n`;
  const labelStr = label ? ` · ${label}` : '';
  md += `> ${dateStr} ${weekday} · AI 三维精选${labelStr} · 总分 ≥ ${minScore}/30\n\n`;

  // 趋势 Highlights
  if (highlights) {
    md += `## 📈 今日趋势\n\n`;
    md += `${highlights}\n\n`;
    md += `---\n\n`;
  }

  for (const [cat, catItems] of sortedCats) {
    md += `## ${cat}\n\n`;

    for (const item of catItems) {
      const display = scoreDisplay(item);
      const tags = item.tags && item.tags.length > 0 ? ` \`${item.tags.join('` `')}\`` : '';
      md += `- [${item.title}](${item.url})${tags}\n`;
      md += `  > ${item.summary} · ${display}\n\n`;
    }
  }

  // 统计
  const total = sortedCats.reduce((sum, [, items]) => sum + items.length, 0);
  const mustRead = sortedCats.reduce((sum, [, items]) => sum + items.filter(i => i._total >= 24).length, 0);
  md += `---\n\n`;
  md += `*共 ${total} 条 · 必读 ${mustRead} 条（24分+）*\n`;

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
  let highlights = '';
  const totalBatches = Math.ceil(items.length / BATCH);
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const batchIdx = Math.floor(i / BATCH);
    const isLast = batchIdx === totalBatches - 1;
    console.log(`    处理第 ${i + 1}-${i + batch.length} 条 ...`);
    const result = await processBatch(batch, label, isLast);
    // 将批次内的 index 转换为全局 index，避免跨批次 index 冲突
    for (const item of result.items) {
      if (item.index != null) item.index += i;
    }
    processed.push(...result.items);
    if (result.highlights) highlights = result.highlights;
  }

  // 生成多版本增强报告（三维评分阈值：满分30）
  const sourceName = filename.replace(/\.md$/, '').replace(/^.*-/, '');
  const versions = [
    { suffix: '-enhanced.md', minScore: 15, label: '完整版' },
    { suffix: '-selected.md', minScore: 21, label: '精选版' },
    { suffix: '-digest.md', minScore: 27, label: '摘要版' },
  ];

  for (const ver of versions) {
    const md = generateEnhancedMd(
      `${sourceName} · ${label}`,
      items,
      processed,
      highlights,
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
