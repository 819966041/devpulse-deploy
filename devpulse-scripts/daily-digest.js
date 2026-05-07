#!/usr/bin/env node
/**
 * DevPulse AI — 每日热点采集
 *
 * 改进：
 *   - 分阶段采集（公开接口优先 → 需要登录态 → GitHub独立）
 *   - 失败降级（使用前一天数据兜底）
 *   - 日志 + 指标集成
 *
 * 用法：
 *   node daily-digest.js            # 全平台采集
 *   node daily-digest.js --public   # 仅公开接口
 *   node daily-digest.js --platform weibo,bilibili,36kr  # 指定平台
 */

// 代理设置
if (!process.env.HTTP_PROXY && !process.env.http_proxy) {
  process.env.HTTP_PROXY = 'http://127.0.0.1:7897';
  process.env.HTTPS_PROXY = 'http://127.0.0.1:7897';
}

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { getToday, getWeekday, execWithTimeout, formatMeta, generateMarkdown, formatNumber, dedupItems } = require('./utils');
const { logger, Metrics } = require('./logger');
const { collectAll: collectRssBlogs } = require('./sources/rss-blog');
const { collectAll: collectXAccounts } = require('./sources/x-accounts');

const args = process.argv.slice(2);
const publicOnly = args.includes('--public');
const platformArg = args.find((a) => a.startsWith('--platform'));
const specifiedPlatforms = platformArg ? platformArg.split('=')[1]?.split(',') : null;

const metrics = new Metrics();

/**
 * 知乎 fallback：直接通过浏览器抓取知乎热榜 API
 */
async function fetchZhihuFallback(order) {
  console.log('  知乎热榜 (fallback) ...');
  logger.info('知乎热榜 fallback 启动');
  try {
    const result = await execWithTimeout(
      'opencli browser open --url "https://www.zhihu.com/hot" --wait 3',
      15000
    );
    const evalResult = await execWithTimeout(
      `opencli browser eval --fn "() => { const items = document.querySelectorAll('.HotList-item'); return Array.from(items).slice(0,15).map(el => { const t = el.querySelector('.HotList-item-title'); const m = el.querySelector('.HotList-item-count'); return { title: t?.textContent?.trim() || '', heat: m?.textContent?.replace(/[^0-9]/g,'') || '', url: t?.href || '' }; }).filter(i => i.title); }" -f json`,
      15000
    );
    await execWithTimeout('opencli browser close', 5000);
    if (evalResult.ok && evalResult.data) {
      const items = Array.isArray(evalResult.data) ? evalResult.data : JSON.parse(evalResult.data);
      console.log(`    ✓ ${items.length} 条 (fallback)`);
      return items.map((item) => ({
        source: '知乎热榜',
        category: '综合',
        sortOrder: order,
        title: item.title,
        url: item.url,
        meta: item.heat ? formatNumber(parseInt(item.heat)) : undefined,
      }));
    }
  } catch (e) { /* ignore */ }
  console.log('    ✗ fallback 也失败');
  return [];
}

/**
 * 采集单个平台
 */
async function fetchPlatform(key, platform, order) {
  const cmd = `opencli ${platform.command} --limit ${config.limit} -f json`;
  console.log(`  ${platform.source} ...`);

  // 分级超时：抖音/知乎快速失败，豆瓣长超时
  const fastFail = ['zhihu', 'douyin'];
  const longTimeout = ['douban'];
  let timeout = config.timeout;
  if (fastFail.includes(key)) timeout = 15000;
  if (longTimeout.includes(key)) timeout = 50000;

  const result = await execWithTimeout(cmd, timeout);

  if (!result.ok || !result.data || result.data.length === 0) {
    console.log(`    ✗ ${result.error || '无数据'}`);
    logger.warn(`${platform.source} 采集失败: ${result.error || '无数据'}`);
    // 知乎 fallback
    if (key === 'zhihu') {
      return await fetchZhihuFallback(order);
    }
    return null; // null 表示失败，触发降级
  }

  const f = platform.fields;
  const items = result.data.slice(0, config.limit).map((item) => {
    let title = (item[f.title] || '未知标题')
      .replace(/^\[流言板\]/, '')
      .replace(/^【.*?】\s*/, '')
      .replace(/^&quot;|&quot;$/g, '')
      .trim();

    let url = item[f.url];
    const subtitle = f.subtitle && item[f.subtitle] ? item[f.subtitle] : undefined;
    if (!url && platform.buildUrl) {
      url = platform.buildUrl(item);
    }
    url = url || '#';
    const label = f.label && item[f.label] ? item[f.label] : undefined;

    return {
      source: platform.source,
      category: platform.category,
      sortOrder: order,
      title,
      subtitle,
      url,
      label,
      meta: formatMeta(item, f),
    };
  });

  console.log(`    ✓ ${items.length} 条`);
  metrics.addSourceSuccess(platform.source);
  return items;
}

/**
 * 降级：从昨天的日报中提取指定来源的数据
 */
function getFallbackItems(source) {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);
    const filePath = path.join(config.outputDir, `daily-digest-${dateStr}.md`);

    if (!fs.existsSync(filePath)) return [];

    const md = fs.readFileSync(filePath, 'utf-8');
    const items = [];
    const lines = md.split('\n');

    for (const line of lines) {
      const match = line.match(/^\*\*(.+?)\*\*$/);
      if (match && match[1] === source) {
        // 进入该来源区域，收集后续条目
        continue;
      }
      if (items.length > 0 && line.match(/^\*\*/)) break; // 遇到下一个来源就停
      if (items.length > 0 || line.includes(source)) {
        const listMatch = line.match(/^-\s*(?:\[([^\]]*)\]\s*)?\[([^\]]+)\]\(([^)]+)\)(.*)/);
        if (listMatch) {
          items.push({
            source: `[昨日] ${source}`,
            category: '',
            sortOrder: 99,
            title: listMatch[2],
            url: listMatch[3],
            meta: listMatch[4]?.trim() || '',
          });
        }
      }
    }

    if (items.length > 0) {
      logger.info(`${source} 降级使用昨日数据: ${items.length} 条`);
    }
    return items;
  } catch (e) {
    return [];
  }
}

/**
 * 分阶段采集
 */
async function collectAll(platforms) {
  metrics.collectionStart();

  // 阶段一：公开接口（必须成功）
  const publicPlatforms = platforms.filter(([, p]) => !p.needAuth);
  // 阶段二：需要登录态（失败可降级）
  const authPlatforms = platforms.filter(([, p]) => p.needAuth);

  console.log(`\n  阶段一：公开接口 (${publicPlatforms.length} 个)`);
  const publicResults = await Promise.all(
    publicPlatforms.map(([key, p], i) => fetchPlatform(key, p, i))
  );

  console.log(`\n  阶段二：需要登录态 (${authPlatforms.length} 个)`);
  const authResults = await Promise.all(
    authPlatforms.map(([key, p], i) => fetchPlatform(key, p, publicPlatforms.length + i))
  );

  metrics.collectionEnd();

  // 处理结果，失败的触发降级
  const allResults = [...publicResults, ...authResults];
  const allItems = [];

  for (let i = 0; i < allResults.length; i++) {
    const result = allResults[i];
    const platformKey = platforms[i]?.[0];
    const platform = platforms[i]?.[1];

    if (result === null || (Array.isArray(result) && result.length === 0 && platform?.needAuth)) {
      // 采集失败，尝试降级
      if (platform) {
        metrics.addSourceFailed(platform.source, '采集失败');
        const fallback = getFallbackItems(platform.source);
        allItems.push(...fallback);
      }
    } else if (Array.isArray(result)) {
      allItems.push(...result);
    }
  }

  return allItems;
}

async function main() {
  console.log('\n========================================');
  console.log(`  ${getToday()} ${getWeekday()} · DevPulse AI 热点采集`);
  console.log('========================================');

  // 筛选平台
  let platforms = Object.entries(config.platforms);
  if (specifiedPlatforms) {
    platforms = platforms.filter(([key]) => specifiedPlatforms.includes(key));
  } else if (publicOnly) {
    platforms = platforms.filter(([, p]) => !p.needAuth);
  }

  // 按 displayOrder 排序
  const orderMap = {};
  config.displayOrder.forEach((key, i) => { orderMap[key] = i; });
  platforms.sort((a, b) => (orderMap[a[0]] ?? 99) - (orderMap[b[0]] ?? 99));

  logger.info(`开始采集 ${platforms.length} 个平台`);

  const allItems = await collectAll(platforms);

  // 阶段三：X/Twitter KOL 推文
  console.log(`\n  阶段三：X/Twitter KOL 推文`);
  try {
    const xItems = await collectXAccounts();
    allItems.push(...xItems);
    logger.info(`X/Twitter KOL: ${xItems.length} 条`);
  } catch (e) {
    logger.warn(`X/Twitter KOL 采集失败: ${e.message}`);
  }

  // 阶段四：RSS 技术博客采集
  console.log(`\n  阶段四：RSS 技术博客`);
  try {
    const rssItems = await collectRssBlogs();
    allItems.push(...rssItems);
    logger.info(`RSS 博客采集: ${rssItems.length} 条`);
  } catch (e) {
    logger.warn(`RSS 博客采集失败: ${e.message}`);
  }

  // 去重
  const beforeDedup = allItems.length;
  const deduped = dedupItems(allItems, 0.7);
  if (deduped.length < beforeDedup) {
    logger.info(`去重: ${beforeDedup} → ${deduped.length} 条 (移除 ${beforeDedup - deduped.length} 条重复)`);
  }

  if (deduped.length === 0) {
    logger.error('未采集到任何数据');
    console.log('\n未采集到数据。请检查浏览器连接和登录状态。\n');
    process.exit(1);
  }

  // 生成日报
  const md = generateMarkdown(deduped, config.sections, getToday(), getWeekday());

  fs.mkdirSync(config.outputDir, { recursive: true });
  const filePath = path.join(config.outputDir, `daily-digest-${getToday()}.md`);
  fs.writeFileSync(filePath, md, 'utf-8');

  // 统计
  const sources = {};
  for (const item of deduped) {
    sources[item.source] = (sources[item.source] || 0) + 1;
  }
  metrics.setItemCount(deduped.length);

  console.log('\n========================================');
  console.log('  采集完成');
  console.log('========================================');
  for (const [s, c] of Object.entries(sources)) {
    console.log(`  ${s}: ${c} 条`);
  }
  console.log(`  总计: ${deduped.length} 条`);
  if (metrics.getFailedCount() > 0) {
    console.log(`  ⚠ ${metrics.getFailedCount()} 个源采集失败，已降级`);
  }
  console.log(`\n  ${filePath}`);

  logger.info(`采集完成: ${deduped.length} 条 (去重前 ${beforeDedup}), ${metrics.getSuccessSources().length} 个源成功, ${metrics.getFailedCount()} 个失败`);
  metrics.save();
}

main().catch((err) => {
  logger.error('运行出错', err);
  console.error('运行出错:', err);
  process.exit(1);
});
