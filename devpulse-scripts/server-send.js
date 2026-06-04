#!/usr/bin/env node
/**
 * DevPulse AI — 服务器端邮件发送（只发不采）
 *
 * 从 output/ 目录读取已采集的数据，AI增强后发送邮件
 * 配合本地采集 + rsync 同步使用
 *
 * 用法：
 *   node server-send.js            # 守护进程（每天09:00发送）
 *   node server-send.js --now      # 立即发送
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { execSync } = require('child_process');
require('dotenv').config();

// 订阅者数据库（devpulse-saas 项目的 Prisma Client）
const SAAS_ROOT = '/home/ubuntu/devpulse-deploy/devpulse-saas';
let prisma = null;
try {
  const { PrismaClient } = require(path.join(SAAS_ROOT, 'node_modules', '@prisma', 'client'));
  prisma = new PrismaClient({ datasources: { db: { url: `file:${path.join(SAAS_ROOT, 'prisma', 'dev.db')}` } } });
} catch (e) {
  console.log('  ⚠ 未找到 Prisma Client，使用 .env 中的收件人');
}

const args = process.argv.slice(2);
const sendNow = args.includes('--now');
const testMode = args.includes('--test');
const testEmail = '819966041@qq.com';

const scriptsDir = __dirname;
const outputDir = path.join(__dirname, '..', 'output');
const sentFlagDir = path.join(__dirname, '..', '.sent-flags');

// 去掉代理（服务器不需要）
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;

const emailConfig = require('./email-config');
const transporter = nodemailer.createTransport(emailConfig.smtp);

// ─── 从 send-digest.js 复制必要的函数 ───
// 这里直接 require 原文件中的解析和HTML生成函数
// 为避免重复代码，直接用 eval 方式加载

const BRAND = {
  primary: '#4F46E5',
  secondary: '#7C3AED',
  accent: '#F59E0B',
  bg: '#F0F2F8',
  sectionBg: '#F7F8FC',
  aiBg: '#F5F3FF',
  textPrimary: '#1E1B4B',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#E0E2EC',
  font: "'PingFang SC','Microsoft YaHei','Helvetica Neue',Arial,sans-serif",
  fontMono: "'SF Mono','Fira Code','Cascadia Code',Consolas,monospace",
  fontEn: "'Helvetica Neue','Segoe UI',Arial,sans-serif",
};

const LANG_COLORS = {
  'Python': '#3572A5', 'JavaScript': '#f1e05a', 'TypeScript': '#3178c6',
  'Rust': '#dea584', 'Go': '#00ADD8', 'Java': '#b07219',
  'C++': '#f34b7d', 'C#': '#178600', 'Swift': '#F05138',
  'PHP': '#4F5D95', 'Shell': '#89e051', 'HTML': '#e34c26',
  'Jupyter Notebook': '#DA5B0B', 'Ruby': '#701516',
};

const CAT_COLORS = {
  'AI/大模型': '#EF4444', '云计算/基础设施': '#3B82F6', '编程工具': '#10B981',
  '前端/移动端': '#8B5CF6', '后端/数据库': '#F97316', '安全/隐私': '#EAB308',
  '创业/融资': '#EC4899', '社会热点': '#6B7280',
};

const ZONES = [
  { name: '科技', icon: '&#x1F4BB;', color: '#3B82F6', bg: '#EFF6FF',
    cats: ['科技与AI', 'AI/大模型', '云计算/基础设施', '硬件', '安全/隐私'] },
  { name: '产品', icon: '&#x1F680;', color: '#F97316', bg: '#FFF7ED',
    cats: ['新产品', 'Product Hunt', '创业/融资'] },
  { name: '开发', icon: '&#x1F6E0;', color: '#10B981', bg: '#ECFDF5',
    cats: ['开发者社区', '编程工具', '前端/移动端', '后端/数据库',
           'HackerNews 热门评论', 'GitHub README 深度', 'DEV.to 文章精华', 'Product Hunt 产品详情'] },
  { name: '社会', icon: '&#x1F30D;', color: '#8B5CF6', bg: '#F5F3FF',
    cats: ['热搜榜', '社会热点'] },
  { name: '娱乐', icon: '&#x1F3AC;', color: '#EC4899', bg: '#FDF2F8',
    cats: ['影娱体育', '豆瓣电影'] },
  { name: '生活', icon: '&#x1F33F;', color: '#10B981', bg: '#ECFDF5',
    cats: ['生活热议', '贴吧', '虎扑', '抖音', 'B站'] },
];

function getToday() { return new Date().toISOString().slice(0, 10); }
function getWeekday() {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return `星期${days[new Date().getDay()]}`;
}
function readReport(filename) {
  const p = path.join(outputDir, filename);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null;
}
function esc(s) { return (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ─── 解析函数 ───

function parseGithubRaw(md) {
  const repos = {};
  const lines = md.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\|\s*(\d+)\s*\|\s*\[([^\]]+)\]\(([^)]+)\)(?:<br><small>([^<]*)<\/small>)?\s*\|\s*(\S+)\s*\|\s*\*?\*?([^\*|]+)\*?\*?\s*\|\s*(\S+)\s*\|/);
    if (!m) continue;
    let section = 'daily';
    for (let j = i - 1; j >= 0; j--) {
      if (lines[j].match(/^###\s+今日/)) { section = 'daily'; break; }
      if (lines[j].match(/^###\s+本周/)) { section = 'weekly'; break; }
      if (lines[j].match(/^###\s+本月/)) { section = 'monthly'; break; }
    }
    repos[m[2]] = {
      rank: parseInt(m[1]), name: m[2], url: m[3],
      description: m[4] || '', language: m[5] === '-' ? '' : m[5],
      stars: m[6].trim(), forks: m[7]?.trim() || '', section,
    };
  }
  return repos;
}

function parseGithubEnhanced(md) {
  const summaries = {};
  if (!md) return summaries;
  const lines = md.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^-\s*\[([^\]]+)\]\(([^)]+)\)/);
    if (!m) continue;
    let summary = '', value = 15;
    if (i + 1 < lines.length) {
      const sm3d = lines[i + 1].match(/^\s*>\s*(.+?)\s*[·]\s*(\d+)\/30/);
      if (sm3d) { summary = sm3d[1].trim(); value = parseInt(sm3d[2]); }
      else {
        const sm = lines[i + 1].match(/^\s*>\s*(.+?)\s*[·]\s*(\d+)\/\d+/);
        if (sm) { summary = sm[1].trim(); value = parseInt(sm[2]) * 3; }
      }
    }
    summaries[m[1]] = { summary, value };
  }
  return summaries;
}

function parseDigestEnhanced(md) {
  const items = [];
  if (!md) return items;
  const lines = md.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 趋势 Highlights
    if (line.match(/今日趋势/)) {
      let text = '';
      for (let j = i + 2; j < lines.length && !lines[j].match(/^---/); j++) {
        text += lines[j] + '\n';
      }
      items.push({ type: 'highlights', text: text.trim() });
      continue;
    }

    // 分类标题
    const catMatch = line.match(/^#{2,3}\s+(.+)$/);
    if (catMatch) { items.push({ type: 'category', name: catMatch[1] }); continue; }
    // 条目
    const itemMatch = line.match(/^-\s*\[([^\]]+)\]\(([^)]+)\)/);
    if (itemMatch) {
      let summary = '', value = 15, category = '';
      const tags = [];
      const tagPart = line.match(/`([^`]+)`/g);
      if (tagPart) {
        for (const t of tagPart) tags.push(t.replace(/`/g, ''));
      }
      if (i + 1 < lines.length) {
        // 三维评分: > 摘要 · 27/30 ★★★★★ (相关10·质量9·时效8) (可能有前导空格)
        const sm3d = lines[i + 1].match(/^\s*>\s*(.+?)\s*[·]\s*(\d+)\/30/);
        if (sm3d) { summary = sm3d[1].trim(); value = parseInt(sm3d[2]); }
        else {
          // 向下兼容旧 10 分制: × 3
          const sm = lines[i + 1].match(/^\s*>\s*(.+?)\s*[·]\s*(\d+)\/\d+/);
          if (sm) { summary = sm[1].trim(); value = parseInt(sm[2]) * 3; }
        }
      }
      for (let j = items.length - 1; j >= 0; j--) {
        if (items[j].type === 'category') { category = items[j].name; break; }
      }
      items.push({ type: 'item', title: itemMatch[1], url: itemMatch[2], summary, value, tags, category });
    }
  }
  return items;
}

function readAnalysis(today) {
  const p = path.join(outputDir, `github-trending-${today}-analysis.json`);
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return {}; }
}

// ─── HTML 生成（与 send-digest.js 完全一致） ───
// 直接 require 原文件复用

function brandHeader(today, weekday) {
  const start = new Date('2026-01-01');
  const now = new Date(today);
  const issue = Math.floor((now - start) / 86400000) + 1;
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="padding:28px 24px 24px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left"><tr>
        <td style="vertical-align:middle;"><div style="width:36px;height:36px;background-color:${BRAND.primary};border-radius:8px;text-align:center;line-height:36px;font-size:16px;color:#FFFFFF;font-weight:700;font-family:${BRAND.fontEn};">D</div></td>
        <td style="padding-left:12px;vertical-align:middle;"><span style="font-family:${BRAND.fontEn};font-size:20px;font-weight:700;color:${BRAND.textPrimary};">DevPulse AI</span></td>
      </tr></table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right"><tr><td style="text-align:right;vertical-align:middle;">
        <div style="font-size:14px;color:${BRAND.textSecondary};font-weight:500;font-family:${BRAND.font};">${today} ${weekday}</div>
        <div style="font-size:12px;color:${BRAND.textMuted};margin-top:2px;font-family:${BRAND.font};">第 ${issue} 期 · 中文开发者 AI 技术日报</div>
      </td></tr></table>
    </td></tr></table>
  </td></tr>
</table>`;
}

function sectionTitle(text, subtitle) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 16px 0;"><tr><td style="vertical-align:middle;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left"><tr>
    <td style="background-color:${BRAND.primary};width:4px;height:24px;border-radius:2px;"></td>
  </tr></table>
  <h2 style="margin:0 0 0 12px;font-family:${BRAND.font};font-size:20px;font-weight:700;color:${BRAND.textPrimary};line-height:24px;display:inline;">${text}</h2>
  ${subtitle ? `<span style="margin-left:8px;font-size:13px;color:${BRAND.textSecondary};font-family:${BRAND.font};">${esc(subtitle)}</span>` : ''}
</td></tr></table>`;
}

function top5Section(items) {
  const scoredItems = items.filter(i => i.type === 'item' && i.value >= 21);
  scoredItems.sort((a, b) => b.value - a.value);
  const top5 = [];
  const usedCats = new Set();
  for (const item of scoredItems) {
    if (top5.length >= 5) break;
    if (!usedCats.has(item.category)) { top5.push(item); usedCats.add(item.category); }
  }
  for (const item of scoredItems) {
    if (top5.length >= 5) break;
    if (!top5.includes(item)) top5.push(item);
  }
  top5.sort((a, b) => b.value - a.value);
  if (top5.length === 0) return '';

  const scoreBadge = (v) => {
    let bg, color, label;
    if (v >= 27) { bg = '#FEF3C7'; color = '#B45309'; label = '必读'; }
    else if (v >= 21) { bg = '#E0E7FF'; color = '#4338CA'; label = '推荐'; }
    else { bg = '#F3F4F6'; color = '#6B7280'; label = '关注'; }
    return `<span style="display:inline-block;margin-left:6px;padding:1px 8px;background-color:${bg};border-radius:4px;font-size:11px;color:${color};font-weight:600;font-family:${BRAND.font};">${label} ${v}/30</span>`;
  };
  const catTag = (cat) => {
    const dotColor = CAT_COLORS[cat] || '#9CA3AF';
    return `<span style="display:inline-block;margin-left:8px;padding:1px 8px;background-color:${dotColor}18;border-radius:4px;font-size:11px;color:${dotColor};font-weight:500;font-family:${BRAND.font};">${esc(cat)}</span>`;
  };

  let itemsHtml = '';
  top5.forEach((item, idx) => {
    if (idx > 0) itemsHtml += `<tr><td style="padding:10px 28px 0 28px;"><div style="border-top:1px dashed ${BRAND.divider};font-size:1px;line-height:1px;">&nbsp;</div></td></tr>`;
    itemsHtml += `
  <tr><td style="padding:14px 28px 0 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="32" style="vertical-align:top;padding-top:2px;"><div style="width:24px;height:24px;background-color:${BRAND.primary};border-radius:50%;text-align:center;line-height:24px;font-size:13px;font-weight:700;color:#FFFFFF;font-family:${BRAND.fontEn};">${idx + 1}</div></td>
      <td style="vertical-align:top;padding-left:12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-bottom:4px;">
          <a href="${item.url}" style="font-family:${BRAND.font};font-size:15px;font-weight:600;color:${BRAND.textPrimary};text-decoration:none;line-height:22px;">${esc(item.title)}</a>${catTag(item.category)}${scoreBadge(item.value)}
        </td></tr></table>
        <p style="margin:0;font-family:${BRAND.font};font-size:13px;color:${BRAND.textSecondary};line-height:20px;">${esc(item.summary)}</p>
      </td>
    </tr></table>
  </td></tr>`;
  });

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.sectionBg};border-radius:12px;overflow:hidden;margin:24px 0 32px 0;">
  <tr><td style="padding:24px 28px 0 28px;">${sectionTitle('今日必读 TOP 5', '30秒抓住今天最重要的事')}</td></tr>
  <tr><td style="padding:16px 28px 0 28px;"><div style="border-top:1px solid ${BRAND.divider};font-size:1px;line-height:1px;">&nbsp;</div></td></tr>
  ${itemsHtml}
  <tr><td style="padding:20px 28px;font-size:1px;line-height:1px;">&nbsp;</td></tr>
</table>`;
}

function sectionHeader(activeTab, tabLabel, sectionLabel, count) {
  const tabs = [{ key: 'daily', label: '日榜' }, { key: 'weekly', label: '周榜' }, { key: 'monthly', label: '月榜' }];
  let tabsHtml = '';
  for (const t of tabs) {
    const isActive = t.key === activeTab;
    tabsHtml += `<td style="padding:5px 16px;background-color:${isActive ? BRAND.primary : '#F3F4F6'};border-radius:20px;font-size:12px;font-weight:${isActive ? '600' : '500'};color:${isActive ? '#FFFFFF' : BRAND.textSecondary};font-family:${BRAND.font};">${t.label}</td><td width="6" style="font-size:1px;">&nbsp;</td>`;
  }
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 12px 0;"><tr><td>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${tabsHtml}</tr></table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;"><tr>
    <td style="padding-bottom:8px;border-bottom:2px solid ${BRAND.border};">
      <span style="font-size:16px;font-weight:700;color:${BRAND.textPrimary};font-family:${BRAND.font};">${tabLabel} ${sectionLabel}</span>
      <span style="font-size:12px;color:${BRAND.textMuted};margin-left:8px;font-family:${BRAND.font};">${count} 个项目</span>
    </td>
  </tr></table>
</td></tr></table>`;
}

function generateGithubCardsHtml(repos, summaries, analysis) {
  const sections = [
    { key: 'daily', tabLabel: '&#x2600;&#xFE0F;', label: '今日新项目 Top 20' },
    { key: 'weekly', tabLabel: '&#x1F4C5;', label: '本周新项目 Top 20' },
    { key: 'monthly', tabLabel: '&#x1F3C6;', label: '本月新项目 Top 20' },
  ];
  let html = sectionTitle('GitHub Trending 新项目', null);
  for (const sec of sections) {
    const items = Object.values(repos).filter(r => r.section === sec.key);
    if (items.length === 0) continue;
    html += sectionHeader(sec.key, sec.tabLabel, sec.label, items.length);
    for (const repo of items) {
      const ogImageUrl = `https://opengraph.githubassets.com/1/${repo.name}`;
      const langColor = LANG_COLORS[repo.language] || '#9CA3AF';
      const ai = summaries[repo.name];
      const deep = analysis[repo.name];
      const starsNum = parseFloat(String(repo.stars).replace(/,/g, ''));
      const isHot = starsNum >= 1000;
      html += `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFFFFF;border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;margin:0 0 16px 0;">
  <tr><td style="padding:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding:20px 24px 16px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="6" style="vertical-align:top;"><div style="width:4px;min-height:40px;border-radius:2px;background-color:${langColor};"></div></td>
          <td style="vertical-align:top;padding-left:14px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="1" style="white-space:nowrap;vertical-align:middle;">
                <a href="${repo.url}" style="font-family:${BRAND.fontMono};font-size:15px;font-weight:700;color:${BRAND.textPrimary};text-decoration:none;">${esc(repo.name)}</a>
                ${repo.language ? `<span style="display:inline-block;margin-left:10px;padding:2px 10px;background-color:${langColor}18;border-radius:20px;font-size:11px;color:${langColor};font-weight:500;font-family:${BRAND.fontEn};">${esc(repo.language)}</span>` : ''}
                ${isHot ? `<span style="display:inline-block;margin-left:8px;padding:2px 10px;background:linear-gradient(135deg,#FEF3C7,#FDE68A);border:1px solid #F59E0B;border-radius:20px;font-size:11px;color:#B45309;font-weight:600;font-family:${BRAND.font};">&#x1F525; 热门</span>` : ''}
              </td>
              <td width="1" style="text-align:right;white-space:nowrap;vertical-align:middle;">
                <span style="font-size:13px;color:${BRAND.textSecondary};font-family:${BRAND.fontEn};">&#x2605; <strong style="color:${isHot ? '#B45309' : BRAND.textPrimary};">${esc(repo.stars)}</strong></span>
              </td>
            </tr></table>
            <p style="margin:8px 0 0 0;font-family:${BRAND.font};font-size:13px;color:${BRAND.textSecondary};line-height:20px;">${esc(repo.description)}</p>
          </td>
        </tr></table>
      </td>
    </tr></table>`;
      if (deep) {
        html += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding:0 24px 20px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="260" style="vertical-align:top;padding-right:16px;">
            <a href="${repo.url}" style="text-decoration:none;"><img src="${ogImageUrl}" width="260" style="display:block;width:260px;height:146px;border-radius:8px;border:1px solid ${BRAND.border};background-color:#F3F4F6;font-size:13px;color:#9CA3AF;" alt="${esc(repo.name)} 预览" /></a>
          </td>
          <td style="vertical-align:top;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.aiBg};border-radius:8px;border-left:3px solid ${BRAND.secondary};">
              <tr><td style="padding:10px 14px 4px 14px;" colspan="2"><span style="font-family:${BRAND.font};font-size:12px;font-weight:700;color:${BRAND.secondary};letter-spacing:1px;">&#x2728; AI 分析</span></td></tr>
              <tr>
                <td width="50%" style="padding:4px 14px 4px 14px;vertical-align:top;"><span style="font-size:10px;color:${BRAND.textMuted};font-weight:600;">&#x1F3AF; 用途</span><br><span style="font-size:12px;color:#374151;font-family:${BRAND.font};line-height:1.5;">${esc(deep.purpose)}</span></td>
                <td width="50%" style="padding:4px 14px 4px 0;vertical-align:top;"><span style="font-size:10px;color:${BRAND.textMuted};font-weight:600;">&#x1F527; 解决</span><br><span style="font-size:12px;color:#374151;font-family:${BRAND.font};line-height:1.5;">${esc(deep.problem)}</span></td>
              </tr>
              <tr>
                <td style="padding:0 14px 4px 14px;vertical-align:top;"><span style="font-size:10px;color:${BRAND.textMuted};font-weight:600;">&#x1F4CD; 领域</span><br><span style="display:inline-block;margin-top:1px;padding:1px 8px;background-color:${BRAND.secondary}18;border-radius:10px;font-size:11px;color:${BRAND.secondary};font-weight:500;">${esc(deep.domain)}</span></td>
                <td style="padding:0 14px 4px 0;vertical-align:top;"><span style="font-size:10px;color:${BRAND.textMuted};font-weight:600;">&#x1F525; 上榜</span><br><span style="font-size:12px;color:#374151;font-family:${BRAND.font};line-height:1.5;">${esc(deep.reason)}</span></td>
              </tr>
              ${deep.highlight ? `<tr><td colspan="2" style="padding:4px 14px 10px 14px;background-color:${BRAND.primary}12;border-radius:0 0 7px 0;"><span style="font-size:10px;color:${BRAND.textMuted};font-weight:600;">&#x2B50; 亮点</span><br><span style="font-size:12px;color:${BRAND.primary};font-family:${BRAND.font};line-height:1.5;font-weight:500;">${esc(deep.highlight)}</span></td></tr>` : ''}
            </table>
          </td>
        </tr></table>
      </td>
    </tr></table>`;
      }
      if (ai && ai.summary) {
        const scoreColor = ai.value >= 27 ? '#B45309' : ai.value >= 21 ? '#4338CA' : BRAND.textMuted;
        const aiLabel = ai.value >= 27 ? '必读' : ai.value >= 21 ? '推荐' : '关注';
        const borderTop = deep ? `border-top:1px solid ${BRAND.border};` : '';
        html += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding:0 24px;"><div style="${borderTop}padding:10px 0;background:#F9FAFB;font-size:13px;color:#374151;line-height:1.6;font-family:${BRAND.font};">${esc(ai.summary)}<span style="display:inline-block;float:right;color:${scoreColor};font-weight:600;font-size:12px;">${aiLabel} ${ai.value}/30</span></div></td>
    </tr></table>`;
      }
      html += `</td></tr></table>`;
    }
  }
  return html;
}

function hotNewsSection(digestItems) {
  let html = sectionTitle('热点资讯', null);
  const catMap = {};
  let currentCat = '';
  for (const item of digestItems) {
    if (item.type === 'category') { currentCat = item.name; continue; }
    if (item.type === 'item') {
      if (!catMap[currentCat]) catMap[currentCat] = [];
      catMap[currentCat].push(item);
    }
  }
  for (const zone of ZONES) {
    const zoneCats = [];
    for (const cat of Object.keys(catMap)) {
      if (!cat) continue;
      const matched = zone.cats.some(zc => cat.includes(zc) || zc.includes(cat));
      if (matched && catMap[cat].length > 0) { zoneCats.push({ name: cat, items: catMap[cat] }); delete catMap[cat]; }
    }
    if (zoneCats.length === 0) continue;
    const totalItems = zoneCats.reduce((s, c) => s + c.items.length, 0);
    html += `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${zone.bg};border:1px solid ${zone.color}22;border-radius:12px;overflow:hidden;margin:0 0 16px 0;">
  <tr><td style="padding:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding:14px 20px 10px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="white-space:nowrap;vertical-align:middle;">
            <span style="font-size:16px;font-weight:700;color:${zone.color};font-family:${BRAND.font};">${zone.icon} ${zone.name}</span>
            <span style="margin-left:8px;font-size:11px;color:${zone.color};font-family:${BRAND.font};opacity:0.7;">${totalItems} 条</span>
          </td>
          <td style="text-align:right;vertical-align:middle;">
            ${zoneCats.map(c => `<span style="display:inline-block;margin-left:4px;padding:1px 8px;background-color:#FFFFFF;border:1px solid ${zone.color}22;border-radius:4px;font-size:10px;color:${zone.color};font-weight:500;font-family:${BRAND.font};">${esc(c.name)}</span>`).join('')}
          </td>
        </tr></table>
      </td>
    </tr></table>`;
    for (const cat of zoneCats) {
      const catDotColor = CAT_COLORS[cat.name] || zone.color;
      if (zoneCats.length > 1) {
        html += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding:8px 20px 4px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="8" style="vertical-align:middle;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="6" height="6" style="background-color:${catDotColor};border-radius:50%;"></td></tr></table></td>
          <td style="padding-left:6px;vertical-align:middle;"><span style="font-size:12px;font-weight:600;color:${zone.color};font-family:${BRAND.font};opacity:0.8;">${esc(cat.name)}</span></td>
        </tr></table>
      </td>
    </tr></table>`;
      }
      for (const item of cat.items) {
        const scoreBadge = item.value >= 27 ? `<span style="display:inline-block;margin-left:6px;padding:1px 8px;background-color:#FEF3C7;border-radius:4px;font-size:11px;color:#B45309;font-weight:600;font-family:${BRAND.font};">必读 ${item.value}/30</span>` : item.value >= 21 ? `<span style="display:inline-block;margin-left:6px;padding:1px 8px;background-color:#E0E7FF;border-radius:4px;font-size:11px;color:#4338CA;font-weight:600;font-family:${BRAND.font};">推荐 ${item.value}/30</span>` : '';
        html += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding:6px 20px 6px 20px;border-top:1px solid ${zone.color}11;">
        <a href="${item.url}" style="font-size:13px;font-weight:500;color:#374151;text-decoration:none;line-height:20px;font-family:${BRAND.font};">${esc(item.title)}</a>${scoreBadge}
        ${item.summary ? `<p style="margin:3px 0 0 0;font-size:12px;color:#6B7280;line-height:18px;font-family:${BRAND.font};">${esc(item.summary)}</p>` : ''}
      </td>
    </tr></table>`;
      }
    }
    html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:8px 20px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr></table>`;
  }
  return html;
}

function brandFooter() {
  return `
<div style="padding:32px 24px 16px 24px;"><div style="border-top:1px solid ${BRAND.border};font-size:1px;line-height:1px;">&nbsp;</div></div>
<div style="padding:16px 24px 32px 24px;text-align:center;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
    <td style="font-size:12px;color:${BRAND.textMuted};line-height:20px;font-family:${BRAND.font};">DevPulse AI &nbsp;|&nbsp; <a href="#" style="color:${BRAND.textSecondary};text-decoration:underline;">GitHub</a> &nbsp;|&nbsp; <a href="#" style="color:${BRAND.textSecondary};text-decoration:underline;">反馈建议</a></td>
  </tr><tr><td style="padding-top:8px;font-size:11px;color:${BRAND.textMuted};font-family:${BRAND.font};">&copy; 2026 DevPulse AI. Powered by GLM + Node.js.</td></tr></table>
</div>`;
}

// ─── AI 增强（在服务器上运行） ───

function runEnhance(filename, label) {
  console.log(`  AI 增强 ${label} ...`);
  try {
    execSync(`node enhance-digest.js --file ${filename}`, { cwd: scriptsDir, stdio: 'pipe', timeout: 600000 });
    console.log(`    ✓ ${label} 增强完成`);
    return true;
  } catch (e) {
    console.log(`    ✗ ${label} 增强失败: ${e.message?.slice(0, 100)}`);
    return false;
  }
}

function runAnalysis() {
  console.log('  GitHub 深度分析 ...');
  try {
    execSync('node github-analysis.js', { cwd: scriptsDir, stdio: 'pipe', timeout: 600000 });
    console.log('    ✓ 深度分析完成');
    return true;
  } catch (e) {
    console.log(`    ✗ 深度分析失败: ${e.message?.slice(0, 100)}`);
    return false;
  }
}

// ─── 发送邮件 ───

async function sendEmail() {
  const today = getToday();
  const weekday = getWeekday();

  // 直接使用本地已增强并上传的数据（服务器不再重复增强）
  const githubRawMd = readReport(`github-trending-${today}.md`);
  const githubEnhancedMd = readReport(`github-trending-${today}-enhanced.md`);
  const digestMd = readReport(`daily-digest-${today}-enhanced.md`) || readReport(`daily-digest-${today}.md`);

  if (!digestMd && !githubRawMd) { console.log('  没有可发送的日报文件'); return false; }

  const attachments = [];
  if (githubEnhancedMd) attachments.push({ filename: `GitHub-Trending-${today}-enhanced.md`, content: githubEnhancedMd });
  if (digestMd) attachments.push({ filename: `热点日报-${today}-enhanced.md`, content: digestMd });

  let body = '';
  body += brandHeader(today, weekday);

  const digestItems = parseDigestEnhanced(digestMd);
  body += top5Section(digestItems);

  let repos = null;
  let summaries = null;
  if (githubRawMd) {
    repos = parseGithubRaw(githubRawMd);
    summaries = parseGithubEnhanced(githubEnhancedMd);
    const analysis = readAnalysis(today);
    body += generateGithubCardsHtml(repos, summaries, analysis);
  }

  const deepEnhancedMd = readReport(`overseas-deep-${today}-enhanced.md`);
  if (deepEnhancedMd) {
    const deepItems = parseDigestEnhanced(deepEnhancedMd);
    if (deepItems.length > 0) body += hotNewsSection(deepItems);
  }

  if (digestItems.length > 0) body += hotNewsSection(digestItems);

  body += brandFooter();

  const htmlBody = `<!DOCTYPE html><html lang="zh-CN"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="x-apple-disable-message-reformatting" />
<title>DevPulse AI - ${today}</title>
<style type="text/css">body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;}body{margin:0;padding:0;width:100%!important;height:100%!important;background-color:${BRAND.bg};}a{color:${BRAND.primary};text-decoration:none;}@media only screen and (max-width:620px){.email-container{width:100%!important;max-width:100%!important;}}</style>
</head><body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:${BRAND.font};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bg};"><tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
${body}
  </table>
</td></tr></table></body></html>`;

  console.log('  发送邮件中 ...');

  let recipients = emailConfig.to;
  let recipientCount = 1;
  if (testMode) {
    recipients = testEmail;
    recipientCount = 1;
    console.log(`  🧪 测试模式: 仅发送到 ${testEmail}`);
  } else if (prisma) {
    try {
      const subs = await prisma.emailSubscription.findMany({ where: { active: true } });
      if (subs.length > 0) {
        recipients = subs.map(s => s.email).join(',');
        recipientCount = subs.length;
        console.log(`  📬 ${subs.length} 位订阅者`);
      }
    } catch (e) {
      console.log(`  ⚠ 数据库查询失败，使用 .env 收件人: ${e.message}`);
    }
    await prisma.$disconnect();
  }

  try {
    await transporter.sendMail({ from: emailConfig.from, to: recipients, subject: `DevPulse AI | ${today} ${weekday}`, html: htmlBody, attachments });
    console.log('  ✓ 邮件发送成功');
    if (!testMode) pushDailyReport(today, weekday, digestItems, repos, summaries);
    return true;
  } catch (e) {
    console.log(`  ✗ 邮件发送失败: ${e.message}`);
    return false;
  }
}

// ─── 企业微信推送 ───

const WECHAT_WEBHOOK = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=202da55c-1c35-4bd2-bc12-15d15c73f51c';
const WECHAT_MAX_BYTES = 4000; // 留余量，企业微信限制 4096 字节

function sendWechatChunk(content) {
  try {
    const payload = JSON.stringify({ msgtype: 'markdown', markdown: { content } });
    const tmpFile = `/tmp/wechat-msg-${Date.now()}.json`;
    fs.writeFileSync(tmpFile, payload, 'utf-8');
    execSync(`curl -s -X POST "${WECHAT_WEBHOOK}" -H "Content-Type: application/json" -d @${tmpFile}`, { stdio: 'pipe', timeout: 10000 });
    fs.unlinkSync(tmpFile);
  } catch (e) {
    console.log(`  ✗ 企业微信推送失败: ${e.message?.slice(0, 80)}`);
  }
}

function pushDailyReport(today, weekday, digestItems, repos, summaries) {
  const chunks = [];
  let current = '';

  function flush() {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  }
  function addLine(line) {
    const next = current ? current + '\n' + line : line;
    if (Buffer.byteLength(next, 'utf-8') > WECHAT_MAX_BYTES) {
      flush();
      current = line;
    } else {
      current = next;
    }
  }

  // 头部
  addLine(`# 📊 DevPulse AI 日报 | ${today} ${weekday}`);
  addLine(`> 已发送给 ${recipientCount} 位订阅者`);
  addLine('');

  // TOP 5
  const scored = digestItems.filter(i => i.type === 'item' && i.value >= 21).sort((a, b) => b.value - a.value);
  const top5 = [];
  const usedCats = new Set();
  for (const item of scored) {
    if (top5.length >= 5) break;
    if (!usedCats.has(item.category)) { top5.push(item); usedCats.add(item.category); }
  }
  for (const item of scored) {
    if (top5.length >= 5) break;
    if (!top5.includes(item)) top5.push(item);
  }
  top5.sort((a, b) => b.value - a.value);

  if (top5.length > 0) {
    addLine(`## 🔥 今日必读 TOP 5`);
    top5.forEach((item, i) => {
      const label = item.value >= 27 ? '<font color="warning">必读</font>' : '<font color="info">推荐</font>';
      addLine(`${i + 1}. **${item.title}** [🔗](${item.url})`);
      addLine(`   > ${item.summary} · ${label} ${item.value}/30`);
    });
    addLine('');
  }

  // GitHub Trending
  if (repos && Object.keys(repos).length > 0) {
    addLine(`## 🐙 GitHub Trending`);
    const daily = Object.values(repos).filter(r => r.section === 'daily').slice(0, 10);
    daily.forEach(repo => {
      const ai = summaries?.[repo.name];
      let line = `- **[${repo.name}](${repo.url})** ⭐ ${repo.stars}`;
      if (repo.language) line += ` \`${repo.language}\``;
      addLine(line);
      if (ai?.summary) addLine(`  > ${ai.summary} · ${ai.value}/30`);
    });
    addLine('');
  }

  // 热点资讯（按分类）
  let currentCat = '';
  for (const item of digestItems) {
    if (item.type === 'category') { currentCat = item.name; continue; }
    if (item.type !== 'item') continue;
    if (item.value >= 21) continue; // TOP 5 已包含
  }

  // 从 digestItems 按分类汇总
  const catMap = {};
  let cat = '';
  for (const item of digestItems) {
    if (item.type === 'category') { cat = item.name; continue; }
    if (item.type === 'item') {
      if (!catMap[cat]) catMap[cat] = [];
      catMap[cat].push(item);
    }
  }

  if (Object.keys(catMap).length > 0) {
    addLine(`## 📰 热点资讯`);
    for (const [catName, items] of Object.entries(catMap)) {
      addLine(`**${catName}** (${items.length}条)`);
      items.slice(0, 5).forEach(item => {
        addLine(`- [${item.title}](${item.url})`);
        if (item.summary) addLine(`  > ${item.summary}`);
      });
      if (items.length > 5) addLine(`  ...及其他 ${items.length - 5} 条`);
      addLine('');
    }
  }

  flush();

  // 逐段推送
  chunks.forEach((chunk, i) => {
    sendWechatChunk(chunk);
    if (i < chunks.length - 1) {
      // 避免推送太快被限流
      execSync('sleep 1', { stdio: 'pipe' });
    }
  });
  console.log(`  ✓ 企业微信推送完成 (${chunks.length} 条消息)`);
}

var recipientCount = 1; // 全局变量，pushDailyReport 中使用

function alreadySent(today) {
  fs.mkdirSync(sentFlagDir, { recursive: true });
  return fs.existsSync(path.join(sentFlagDir, today));
}

function markSent(today) {
  fs.mkdirSync(sentFlagDir, { recursive: true });
  fs.writeFileSync(path.join(sentFlagDir, today), new Date().toISOString());
}

// ─── 入口 ───

async function runOnce() {
  const today = getToday();
  console.log(`\n[DevPulse AI] ${today} ${getWeekday()}\n`);
  const ok = await sendEmail();
  if (ok) markSent(today);
  process.exit(0);
}

async function runDaemon() {
  console.log('========================================');
  console.log('  DevPulse AI 服务器发送守护进程');
  console.log('  每天 09:00 自动发送邮件');
  console.log('  按 Ctrl+C 退出');
  console.log('========================================\n');

  try { await transporter.verify(); console.log('  ✓ SMTP 连接成功\n'); }
  catch (e) { console.log(`  ✗ SMTP 连接失败: ${e.message}\n`); }

  function check() {
    const now = new Date();
    const today = getToday();
    if (now.getHours() === 9 && now.getMinutes() <= 5 && !alreadySent(today)) {
      console.log(`\n[${now.toLocaleTimeString()}] 发送邮件 ...\n`);
      sendEmail().then((ok) => { if (ok) markSent(today); });
    }
  }

  check();
  setInterval(check, 60000);
}

if (sendNow) { runOnce(); } else { runDaemon(); }
