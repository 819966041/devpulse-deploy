/**
 * 工具函数
 */

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekday() {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return `星期${days[new Date().getDay()]}`;
}

/**
 * 带超时执行命令
 */
function execWithTimeout(cmd, timeoutMs) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const timer = setTimeout(() => {
      resolve({ ok: false, error: `timeout after ${timeoutMs}ms` });
    }, timeoutMs);

    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      clearTimeout(timer);
      if (err) {
        try {
          const parsed = JSON.parse(stdout);
          resolve({ ok: false, error: parsed.error?.message || stderr || err.message });
        } catch {
          resolve({ ok: false, error: stderr || err.message });
        }
        return;
      }
      try {
        const data = JSON.parse(stdout);
        if (data.ok === false) {
          resolve({ ok: false, error: data.error?.message || 'unknown error' });
        } else {
          resolve({ ok: true, data: Array.isArray(data) ? data : [data] });
        }
      } catch {
        resolve({ ok: false, error: 'failed to parse JSON output' });
      }
    });
  });
}

/**
 * 格式化数字：1234567 → 123.4万
 */
function formatNumber(n) {
  if (n == null) return '';
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

/**
 * 格式化热度元信息
 */
function formatMeta(item, fields) {
  const parts = [];
  if (fields.heat && item[fields.heat]) {
    parts.push(formatNumber(item[fields.heat]));
  }
  if (fields.score && item[fields.score]) {
    parts.push(`${item[fields.score]}分`);
  }
  if (fields.comments && item[fields.comments]) {
    parts.push(`${item[fields.comments]}评`);
  }
  if (fields.replies && item[fields.replies]) {
    parts.push(`${item[fields.replies]}回`);
  }
  if (fields.play && item[fields.play]) {
    parts.push(`${formatNumber(item[fields.play])}播放`);
  }
  if (fields.rating && item[fields.rating] && item[fields.rating] > 0) {
    parts.push(`⭐${item[fields.rating]}`);
  }
  if (fields.year && item[fields.year] && String(item[fields.year]).match(/^\d{4}$/)) {
    parts.push(item[fields.year]);
  }
  if (fields.author && item[fields.author]) {
    parts.push(`@${item[fields.author]}`);
  }
  return parts.join(' · ');
}

/**
 * 内容去重：URL 精确去重 + 标题相似度去重
 * threshold: Jaccard 相似度阈值，>= 此值视为重复
 */
function dedupItems(items, threshold = 0.7) {
  if (!items || items.length === 0) return items;

  // 第一轮：URL 精确去重
  const seenUrls = new Set();
  const afterUrl = [];
  for (const item of items) {
    if (!item.url || item.url === '#') {
      afterUrl.push(item);
      continue;
    }
    const normalizedUrl = item.url.replace(/#.*$/, '').replace(/\?.*$/, ''); // 去掉 hash 和 query
    if (!seenUrls.has(normalizedUrl)) {
      seenUrls.add(normalizedUrl);
      afterUrl.push(item);
    }
  }

  // 第二轮：标题相似度去重（Jaccard 字符级）
  const kept = [];
  for (const item of afterUrl) {
    const titleChars = new Set(cleanTitle(item.title));
    const isDup = kept.some(existing => {
      const existingChars = new Set(cleanTitle(existing.title));
      if (titleChars.size === 0 || existingChars.size === 0) return false;
      // Jaccard: 交集 / 并集
      let intersection = 0;
      for (const c of titleChars) {
        if (existingChars.has(c)) intersection++;
      }
      const union = new Set([...titleChars, ...existingChars]).size;
      return (intersection / union) >= threshold;
    });

    if (!isDup) {
      kept.push(item);
    } else {
      // 标记重复来源
      const last = kept[kept.length - 1];
      if (last && last.source !== item.source) {
        last._dupSources = last._dupSources || [last.source];
        if (!last._dupSources.includes(item.source)) {
          last._dupSources.push(item.source);
        }
      }
    }
  }

  // 后处理：如果有重复来源标记，追加到 meta
  for (const item of kept) {
    if (item._dupSources && item._dupSources.length > 1) {
      const label = item.meta ? `${item.meta} [${item._dupSources.join('/')}]` : `[${item._dupSources.join('/')}]`;
      item.meta = label;
    }
    delete item._dupSources;
  }

  return kept;
}

/**
 * 清洗标题：去标点、空格、转小写，用于相似度比较
 */
function cleanTitle(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[\s\-\_\.\,\!\?\，\。\！\？\：\；\、\「\」\（\）\[\]\(\)\{\}《》""''\u200b]/g, '')
    .split('');
}

/**
 * 生成高品质 Markdown 日报
 */
function generateMarkdown(allItems, sections, dateStr, weekday) {
  // 按板块分组
  const grouped = {};
  for (const section of sections) {
    grouped[section.name] = [];
  }
  grouped['其他'] = [];

  for (const item of allItems) {
    let placed = false;
    for (const section of sections) {
      if (section.categories.includes(item.category)) {
        grouped[section.name].push(item);
        placed = true;
        break;
      }
    }
    if (!placed) grouped['其他'].push(item);
  }

  // 按平台分组（同一板块内）
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
  }

  // 生成 Markdown
  let md = '';
  md += `# ${dateStr}  ${weekday}\n\n`;
  md += `> 每日热点精选 · 覆盖 ${new Set(allItems.map(i => i.source)).size} 个平台\n\n`;

  for (const section of sections) {
    const items = grouped[section.name];
    if (!items || items.length === 0) continue;

    md += `---\n\n`;
    md += `### ${section.icon} ${section.name}\n\n`;

    // 按来源分组显示
    const bySource = {};
    for (const item of items) {
      if (!bySource[item.source]) bySource[item.source] = [];
      bySource[item.source].push(item);
    }

    for (const [source, sourceItems] of Object.entries(bySource)) {
      md += `**${source}**\n\n`;
      for (const item of sourceItems) {
        const meta = item.meta || '';
        const label = item.label ? ` [${item.label}]` : '';
        if (item.subtitle) {
          md += `- [${item.title}](${item.url})\n  > ${item.subtitle}${meta ? ` · ${meta}` : ''}\n\n`;
        } else {
          md += `- ${label}[${item.title}](${item.url})${meta ? ` · ${meta}` : ''}\n`;
        }
      }
      md += '\n';
    }
  }

  // 其他板块
  const others = grouped['其他'];
  if (others && others.length > 0) {
    md += `---\n\n### 📋 其他\n\n`;
    for (const item of others) {
      const meta = item.meta || '';
      md += `- [${item.title}](${item.url})${meta ? ` · ${meta}` : ''}\n`;
    }
    md += '\n';
  }

  md += `---\n\n`;
  const successSources = [...new Set(allItems.map(i => i.source))].join('、');
  md += `*数据来源：${successSources} · 共 ${allItems.length} 条*\n`;

  return md;
}

module.exports = { getToday, getWeekday, execWithTimeout, formatNumber, formatMeta, generateMarkdown, dedupItems };
