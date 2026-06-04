import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), '..', 'output');

// ── 类型定义 ──

export interface DigestItem {
  title: string;
  url: string;
  summary: string;
  score: number;
  cat: string;
  source: string;
  tags: string[];
}

export interface GithubRepo {
  title: string;
  url: string;
  description: string;
  language: string;
  color: string;
  stars: number;
}

export interface RepoAnalysis {
  purpose: string;
  problem: string;
  domain: string;
  reason: string;
  highlight: string;
  summary?: string;
  value?: number;
}

export interface ZoneItem {
  name: string;
  icon: string;
  color: string;
  bg: string;
  items: DigestItem[];
}

export interface DigestData {
  date: string;
  weekday: string;
  issue: number;
  top5: DigestItem[];
  github: {
    daily: GithubRepo[];
    weekly: GithubRepo[];
    monthly: GithubRepo[];
  };
  analysis: Record<string, RepoAnalysis>;
  overseas: DigestItem[];
  zones: ZoneItem[];
}

// ── 常量 ──

const LANG_COLORS: Record<string, string> = {
  'Python': '#3572A5', 'JavaScript': '#f1e05a', 'TypeScript': '#3178c6',
  'Rust': '#dea584', 'Go': '#00ADD8', 'Java': '#b07219',
  'C++': '#f34b7d', 'C#': '#178600', 'Swift': '#F05138',
  'PHP': '#4F5D95', 'Shell': '#89e051', 'HTML': '#e34c26',
  'Jupyter Notebook': '#DA5B0B', 'Ruby': '#701516',
};

const ZONES_CONFIG = [
  { name: '科技', icon: '💻', color: '#3B82F6', bg: '#EFF6FF',
    cats: ['科技与AI', 'AI/大模型', '云计算/基础设施', '硬件', '安全/隐私'] },
  { name: '产品', icon: '🚀', color: '#F97316', bg: '#FFF7ED',
    cats: ['新产品', 'Product Hunt', '创业/融资'] },
  { name: '开发', icon: '🛠️', color: '#10B981', bg: '#ECFDF5',
    cats: ['开发者社区', '编程工具', '前端/移动端', '后端/数据库',
           'HackerNews 热门评论', 'GitHub README 深度', 'DEV.to 文章精华', 'Product Hunt 产品详情'] },
  { name: '社会', icon: '🌍', color: '#8B5CF6', bg: '#F5F3FF',
    cats: ['热搜榜', '社会热点'] },
  { name: '娱乐', icon: '🎬', color: '#EC4899', bg: '#FDF2F8',
    cats: ['影娱体育', '豆瓣电影'] },
  { name: '生活', icon: '🌿', color: '#10B981', bg: '#ECFDF5',
    cats: ['生活热议', '贴吧', '虎扑', '抖音', 'B站'] },
];

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const BASE_DATE = '2026-01-01';

// ── 工具函数 ──

function readFile(filename: string): string | null {
  const p = path.join(OUTPUT_DIR, filename);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf-8');
}

function readJsonFile(filename: string): Record<string, unknown> | null {
  const p = path.join(OUTPUT_DIR, filename);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

export function findLatestDate(): string | null {
  if (!fs.existsSync(OUTPUT_DIR)) return null;
  const files = fs.readdirSync(OUTPUT_DIR);
  const dates = new Set<string>();
  for (const f of files) {
    const m = f.match(/^daily-digest-(\d{4}-\d{2}-\d{2})/);
    if (m) dates.add(m[1]);
  }
  if (dates.size === 0) return null;
  return [...dates].sort().reverse()[0];
}

export function getAvailableDates(): string[] {
  if (!fs.existsSync(OUTPUT_DIR)) return [];
  const files = fs.readdirSync(OUTPUT_DIR);
  const dates = new Set<string>();
  for (const f of files) {
    const m = f.match(/^daily-digest-(\d{4}-\d{2}-\d{2})/);
    if (m) dates.add(m[1]);
  }
  return [...dates].sort().reverse();
}

function calcIssue(dateStr: string): number {
  const base = new Date(BASE_DATE);
  const current = new Date(dateStr);
  return Math.floor((current.getTime() - base.getTime()) / (86400000)) + 1;
}

function getWeekday(dateStr: string): string {
  return '周' + WEEKDAYS[new Date(dateStr + 'T00:00:00+08:00').getDay()];
}

// ── 解析器 ──

function parseDigestEnhanced(md: string): DigestItem[] {
  const items: DigestItem[] = [];
  const lines = md.split('\n');
  let currentCat = '';

  for (let i = 0; i < lines.length; i++) {
    const catMatch = lines[i].match(/^#{2,3}\s+(.+)$/);
    if (catMatch) { currentCat = catMatch[1]; continue; }

    const itemMatch = lines[i].match(/^-\s*\[([^\]]+)\]\(([^)]+)\)/);
    if (itemMatch) {
      let summary = '';
      let value = 0;
      const tags: string[] = [];

      const tagPart = lines[i].match(/`([^`]+)`/g);
      if (tagPart) {
        for (const t of tagPart) tags.push(t.replace(/`/g, ''));
      }

      if (i + 1 < lines.length) {
        const sm3d = lines[i + 1].match(/^\s*>\s*(.+?)\s*[·]\s*(\d+)\/30/);
        if (sm3d) { summary = sm3d[1].trim(); value = parseInt(sm3d[2]); }
        else {
          const sm = lines[i + 1].match(/^\s*>\s*(.+?)\s*[·]\s*(\d+)\/\d+/);
          if (sm) { summary = sm[1].trim(); value = parseInt(sm[2]) * 3; }
        }
      }

      items.push({
        title: itemMatch[1],
        url: itemMatch[2],
        summary,
        score: Math.round(value / 3),
        cat: currentCat,
        source: tags[0] || currentCat,
        tags,
      });
    }
  }
  return items;
}

function parseGithubSection(md: string): GithubRepo[] {
  const items: GithubRepo[] = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*\d+\s*\|\s*\[([^\]]+)\]\(([^)]+)\)(?:<br><small>([^<]*)<\/small>)?\s*\|\s*(\S+)\s*\|\s*\*?\*?([^\*|]+)\*?\*?\s*\|\s*(\S+)\s*\|/);
    if (!m) continue;
    const lang = m[4] === '-' ? '' : m[4];
    const starsStr = m[5].trim().replace(/,/g, '');
    const stars = parseFloat(starsStr) || 0;
    items.push({
      title: m[1],
      url: m[2],
      description: m[3] || '',
      language: lang,
      color: LANG_COLORS[lang] || '#9CA3AF',
      stars,
    });
  }
  return items;
}

function parseGithubByPeriod(md: string): { daily: GithubRepo[]; weekly: GithubRepo[]; monthly: GithubRepo[] } {
  const lines = md.split('\n');
  let period = '';
  const sections: Record<string, string> = { daily: '', weekly: '', monthly: '' };

  for (const line of lines) {
    if (line.match(/^###\s+今日/)) { period = 'daily'; continue; }
    if (line.match(/^###\s+本周/)) { period = 'weekly'; continue; }
    if (line.match(/^###\s+本月/)) { period = 'monthly'; continue; }
    if (period) sections[period] += line + '\n';
  }

  return {
    daily: parseGithubSection(sections.daily),
    weekly: parseGithubSection(sections.weekly),
    monthly: parseGithubSection(sections.monthly),
  };
}

function selectTop5(items: DigestItem[]): DigestItem[] {
  const sorted = [...items].sort((a, b) => b.score - a.score);
  const selected: DigestItem[] = [];
  const usedCats = new Set<string>();
  for (const item of sorted) {
    if (selected.length >= 5) break;
    if (!usedCats.has(item.cat)) { selected.push(item); usedCats.add(item.cat); }
  }
  for (const item of sorted) {
    if (selected.length >= 5) break;
    if (!selected.includes(item)) selected.push(item);
  }
  selected.sort((a, b) => b.score - a.score);
  return selected;
}

function groupByZones(items: DigestItem[]): ZoneItem[] {
  return ZONES_CONFIG.map(zone => {
    const zoneItems = items.filter(item =>
      zone.cats.some(cat => item.cat.includes(cat) || cat.includes(item.cat))
    );
    return { ...zone, items: zoneItems };
  }).filter(zone => zone.items.length > 0);
}

// ── 主函数 ──

export function loadDigestData(date: string): DigestData | null {
  const digestMd = readFile(`daily-digest-${date}-enhanced.md`);
  if (!digestMd) return null;

  const githubMd = readFile(`github-trending-${date}.md`);
  const analysisRaw = readJsonFile(`github-trending-${date}-analysis.json`);
  const analysis = (analysisRaw || {}) as Record<string, RepoAnalysis>;
  const overseasMd = readFile(`overseas-deep-${date}-enhanced.md`);

  const allItems = parseDigestEnhanced(digestMd);
  const top5 = selectTop5(allItems);
  const zones = groupByZones(allItems);

  let github = { daily: [] as GithubRepo[], weekly: [] as GithubRepo[], monthly: [] as GithubRepo[] };
  if (githubMd) {
    github = parseGithubByPeriod(githubMd);
  }

  const overseas = overseasMd ? parseDigestEnhanced(overseasMd) : [];

  return {
    date,
    weekday: getWeekday(date),
    issue: calcIssue(date),
    top5,
    github,
    analysis,
    overseas,
    zones,
  };
}
