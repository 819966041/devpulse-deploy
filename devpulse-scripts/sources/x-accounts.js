/**
 * X/Twitter 精选 KOL 账号推文采集
 *
 * 参考 follow-builders 项目，追踪 25 个 AI 领域顶级从业者
 * 使用 opencli twitter search 逐账号抓取，GLM 批量翻译标题
 *
 * 用法：
 *   node x-accounts.js                  # 采集所有账号
 *   node x-accounts.js --handle karpathy # 指定账号
 */

const { execSync } = require('child_process');
const { chat: aiChat } = require('../kimi-config');

const ACCOUNTS = [
  { name: 'Andrej Karpathy', handle: 'karpathy', role: 'AI研究者' },
  { name: 'Swyx', handle: 'swyx', role: 'AI编辑' },
  { name: 'Josh Woodward', handle: 'joshwoodward', role: 'Google' },
  { name: 'Kevin Weil', handle: 'kevinweil', role: 'OpenAI' },
  { name: 'Peter Yang', handle: 'petergyang', role: 'PM' },
  { name: 'Nan Yu', handle: 'thenanyu', role: 'PM' },
  { name: 'Madhu Guru', handle: 'realmadhuguru', role: '工程师' },
  { name: 'Amanda Askell', handle: 'AmandaAskell', role: 'Anthropic' },
  { name: 'Cat Wu', handle: '_catwu', role: '产品' },
  { name: 'Thariq', handle: 'trq212', role: '工程师' },
  { name: 'Google Labs', handle: 'GoogleLabs', role: 'Google' },
  { name: 'Amjad Masad', handle: 'amasad', role: 'Replit CEO' },
  { name: 'Guillermo Rauch', handle: 'rauchg', role: 'Vercel CEO' },
  { name: 'Alex Albert', handle: 'alexalbert__', role: 'Anthropic' },
  { name: 'Aaron Levie', handle: 'levie', role: 'Box CEO' },
  { name: 'Ryo Lu', handle: 'ryolu_', role: '工程师' },
  { name: 'Garry Tan', handle: 'garrytan', role: 'YC总裁' },
  { name: 'Matt Turck', handle: 'mattturck', role: '投资人' },
  { name: 'Zara Zhang', handle: 'zarazhangrui', role: 'AI编辑' },
  { name: 'Nikunj Kothari', handle: 'nikunj', role: '创始人' },
  { name: 'Peter Steinberger', handle: 'steipete', role: '开发者' },
  { name: 'Dan Shipper', handle: 'danshipper', role: 'Every CEO' },
  { name: 'Aditya Agarwal', handle: 'adityaag', role: '工程师' },
  { name: 'Sam Altman', handle: 'sama', role: 'OpenAI CEO' },
  { name: 'Claude', handle: 'claudeai', role: 'Anthropic' },
];

const TWEETS_PER_ACCOUNT = 3;
const TIMEOUT_MS = 20000;

function fetchAccountTweets(handle) {
  try {
    const cmd = `opencli twitter search "from:${handle}" --limit ${TWEETS_PER_ACCOUNT} -f json`;
    const raw = execSync(cmd, { timeout: TIMEOUT_MS, encoding: 'utf-8' });
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

async function translateTitles(items) {
  if (items.length === 0) return items;

  const system = `你是一个英中翻译助手。将以下推文标题翻译为简明中文。保持技术术语不翻译（如 API、LLM、Claude 等）。
严格返回 JSON 数组，每个元素是翻译后的中文标题，顺序与输入一致。不要添加额外内容。`;

  const BATCH_SIZE = 20;
  const result = [...items];

  for (let start = 0; start < items.length; start += BATCH_SIZE) {
    const batch = items.slice(start, start + BATCH_SIZE);
    const list = batch.map((it, i) => `[${i}] ${it.title}`).join('\n');

    try {
      const resp = await aiChat(system, list, { jsonMode: true, temperature: 0.1, maxTokens: 4096 });
      const translations = JSON.parse(resp);
      if (Array.isArray(translations)) {
        for (let i = 0; i < batch.length; i++) {
          const zh = translations[i] || '';
          const globalIdx = start + i;
          if (zh && zh !== result[globalIdx].title) {
            result[globalIdx] = { ...result[globalIdx], title: `${result[globalIdx].title}（${zh}）` };
          }
        }
      }
      process.stdout.write(`    翻译 ${start + 1}-${Math.min(start + BATCH_SIZE, items.length)} ✓\n`);
    } catch (e) {
      console.log(`    ⚠ 翻译 ${start + 1}-${Math.min(start + BATCH_SIZE, items.length)} 失败: ${e.message?.slice(0, 80)}`);
    }
  }

  return result;
}

async function collectAll() {
  console.log(`\n  X/Twitter KOL 采集 (${ACCOUNTS.length} 个账号)`);

  const allItems = [];
  let successCount = 0;

  for (const acct of ACCOUNTS) {
    process.stdout.write(`    ${acct.handle} ... `);
    const tweets = fetchAccountTweets(acct.handle);

    if (tweets.length === 0) {
      console.log('✗ 无数据');
      continue;
    }

    console.log(`✓ ${tweets.length} 条`);
    successCount++;

    for (const tw of tweets) {
      const text = (tw.text || '').slice(0, 200).replace(/\n/g, ' ').trim();
      if (!text) continue;

      allItems.push({
        source: `@${acct.handle} (${acct.name})`,
        category: 'AI/大模型',
        sortOrder: 5,
        title: text,
        url: tw.url || `https://x.com/${acct.handle}`,
        subtitle: `${acct.role} · ❤️ ${tw.likes || 0} · 👁 ${tw.views || 'N/A'}`,
        meta: `${acct.name} (@${acct.handle})`,
        _likes: tw.likes || 0,
      });
    }
  }

  console.log(`    采集: ${allItems.length} 条 (${successCount}/${ACCOUNTS.length} 账号成功)`);

  // 按 likes 降序排
  allItems.sort((a, b) => (b._likes || 0) - (a._likes || 0));

  // 批量翻译标题
  console.log('    翻译标题 ...');
  const translated = await translateTitles(allItems);

  // 清理内部字段
  return translated.map(({ _likes, ...rest }) => rest);
}

// CLI 独立运行
if (require.main === module) {
  collectAll().then((items) => {
    console.log(`\n合计: ${items.length} 条`);
    items.slice(0, 5).forEach((it) => {
      console.log(`  - ${it.title.slice(0, 80)}...`);
    });
  });
}

module.exports = { collectAll, ACCOUNTS };
