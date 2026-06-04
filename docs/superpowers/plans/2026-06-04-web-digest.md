# Web 版日报页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 DevPulse Next.js 项目中新增 Web 版日报页面 `/digest/[date]`，并改造企业微信推送为链接模式。

**Architecture:** Next.js 服务端组件读取 `output/` 的 markdown/JSON 数据，通过 props 传递给客户端组件处理交互（侧边栏滚动追踪、GitHub Tab 切换、移动端浮动菜单）。解析逻辑从现有 API 路由提取为共享模块。

**Tech Stack:** Next.js 15 (App Router), React 19, TailwindCSS v4, TypeScript

**Spec:** `docs/superpowers/specs/2026-06-04-web-digest-design.md`

---

## File Structure

```
新增文件:
  src/lib/digest-parser.ts              # 共享数据解析模块
  src/app/digest/[date]/page.tsx         # 日报详情页（服务端组件）
  src/app/digest/page.tsx                # 日报列表页/跳转
  src/components/digest/DigestContent.tsx # 主内容客户端组件
  src/components/digest/Top5Section.tsx   # TOP5 版块
  src/components/digest/GithubSection.tsx # GitHub Trending 版块
  src/components/digest/HotNewsSection.tsx # 热点资讯版块
  src/components/digest/Sidebar.tsx       # 侧边栏（目录+历史）

修改文件:
  src/app/api/community/digest/route.ts  # 改用共享 parser
  devpulse-scripts/server-send.js         # pushDailyReport 改为推链接
```

---

### Task 1: 创建共享数据解析模块

**Files:**
- Create: `src/lib/digest-parser.ts`

- [ ] **Step 1: 创建 digest-parser.ts**

从 `src/app/api/community/digest/route.ts` 提取解析逻辑，扩展支持全部版块数据。

```typescript
// src/lib/digest-parser.ts
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
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/digest-parser.ts
git commit -m "feat: 创建共享日报数据解析模块 digest-parser.ts"
```

---

### Task 2: 创建 Top5Section 组件

**Files:**
- Create: `src/components/digest/Top5Section.tsx`

- [ ] **Step 1: 创建组件**

```tsx
// src/components/digest/Top5Section.tsx
import { DigestItem } from '@/lib/digest-parser';

interface Top5SectionProps {
  items: DigestItem[];
}

export default function Top5Section({ items }: Top5SectionProps) {
  if (items.length === 0) return null;

  return (
    <section id="top5" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🔥</span>
        <h2 className="font-bold text-base">今日必读 TOP 5</h2>
        <span className="text-xs text-gray-400 ml-2">30秒抓住今天最重要的事</span>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="border-l-3 pl-4 py-2 rounded-r-lg hover:bg-gray-50 transition"
            style={{ borderLeftColor: 'var(--primary)', background: '#F5F3FF' }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold"
                style={{ background: i === 0 ? 'var(--primary)' : 'var(--primary-light)' }}
              >
                {i + 1}
              </span>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sm text-gray-800 hover:text-[var(--primary)] transition-colors"
              >
                {item.title}
              </a>
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                {item.cat}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                item.score >= 9 ? 'badge-must-read' : item.score >= 7 ? 'badge-recommended' : 'badge-worth'
              }`}>
                {item.score >= 9 ? '必读' : item.score >= 7 ? '推荐' : '关注'} {item.score}
              </span>
            </div>
            {item.summary && (
              <p className="text-xs text-gray-400 mt-1 ml-8">{item.summary}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/digest/Top5Section.tsx
git commit -m "feat: 创建 Top5Section 日报组件"
```

---

### Task 3: 创建 GithubSection 组件

**Files:**
- Create: `src/components/digest/GithubSection.tsx`

- [ ] **Step 1: 创建组件**

```tsx
// src/components/digest/GithubSection.tsx
'use client';

import { useState } from 'react';
import { GithubRepo, RepoAnalysis } from '@/lib/digest-parser';

interface GithubSectionProps {
  daily: GithubRepo[];
  weekly: GithubRepo[];
  monthly: GithubRepo[];
  analysis: Record<string, RepoAnalysis>;
}

type Period = 'daily' | 'weekly' | 'monthly';

const PERIOD_LABELS: Record<Period, string> = { daily: '日榜', weekly: '周榜', monthly: '月榜' };

export default function GithubSection({ daily, weekly, monthly, analysis }: GithubSectionProps) {
  const [activePeriod, setActivePeriod] = useState<Period>('daily');

  const repos = { daily, weekly, monthly }[activePeriod];

  if (daily.length === 0 && weekly.length === 0 && monthly.length === 0) return null;

  return (
    <section id="github" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">📊</span>
        <h2 className="font-bold text-base">GitHub Trending</h2>
      </div>

      <div className="flex gap-1 mb-4">
        {(['daily', 'weekly', 'monthly'] as Period[]).map(period => (
          <button
            key={period}
            onClick={() => setActivePeriod(period)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activePeriod === period
                ? 'bg-[var(--primary)] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {PERIOD_LABELS[period]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {repos.map((repo, i) => {
          const ai = analysis[repo.title];
          const isHot = repo.stars >= 1000;
          const ogUrl = `https://opengraph.githubassets.com/1/${repo.title}`;

          return (
            <div key={i} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="lang-dot" style={{ background: repo.color }} />
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono font-semibold text-sm text-gray-800 hover:text-[var(--primary)] transition-colors"
                  >
                    {repo.title}
                  </a>
                  {repo.language && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded">{repo.language}</span>
                  )}
                  {isHot && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-medium">🔥 热门</span>
                  )}
                </div>
                <span className="text-amber-500 font-semibold text-sm">⭐ {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}</span>
              </div>

              {repo.description && (
                <p className="text-xs text-gray-500 mt-2">{repo.description}</p>
              )}

              {ai && (
                <div className="flex flex-col md:flex-row gap-3 mt-3">
                  <img
                    src={ogUrl}
                    alt={repo.title}
                    className="w-full md:w-[280px] h-auto md:h-[158px] rounded-lg object-cover bg-gray-100 flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="font-bold text-xs text-green-800 mb-2">🤖 AI 深度分析</div>
                    <div className="text-[11px] text-gray-700 space-y-1">
                      {ai.purpose && <div><strong>用途：</strong>{ai.purpose}</div>}
                      {ai.problem && <div><strong>解决问题：</strong>{ai.problem}</div>}
                      {ai.domain && <div><strong>领域：</strong>{ai.domain}</div>}
                      {ai.reason && <div><strong>推荐理由：</strong>{ai.reason}</div>}
                      {ai.highlight && <div><strong>亮点：</strong>{ai.highlight}</div>}
                    </div>
                  </div>
                </div>
              )}

              {ai?.summary && (
                <div className="mt-3 bg-[#F5F3FF] rounded-lg px-3 py-2 flex justify-between items-center">
                  <span className="text-[11px] text-[var(--primary)]">{ai.summary}</span>
                  {ai.value !== undefined && (
                    <span className="text-[10px] px-2 py-0.5 bg-[var(--primary)] text-white rounded-full ml-2 flex-shrink-0">
                      推荐 {ai.value}/30
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/digest/GithubSection.tsx
git commit -m "feat: 创建 GithubSection 组件（Tab 切换 + AI 分析）"
```

---

### Task 4: 创建 HotNewsSection 组件

**Files:**
- Create: `src/components/digest/HotNewsSection.tsx`

- [ ] **Step 1: 创建组件**

```tsx
// src/components/digest/HotNewsSection.tsx
import { ZoneItem } from '@/lib/digest-parser';

interface HotNewsSectionProps {
  zones: ZoneItem[];
  title?: string;
  sectionId?: string;
}

export default function HotNewsSection({ zones, title = '热点资讯', sectionId = 'hotnews' }: HotNewsSectionProps) {
  if (zones.length === 0) return null;

  return (
    <section id={sectionId} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">📡</span>
        <h2 className="font-bold text-base">{title}</h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {zones.map(zone => (
          <a
            key={zone.name}
            href={`#zone-${sectionId}-${zone.name}`}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium transition hover:opacity-80"
            style={{ background: zone.bg, color: zone.color }}
          >
            {zone.icon} {zone.name}
          </a>
        ))}
      </div>

      <div className="space-y-4">
        {zones.map(zone => (
          <div
            key={zone.name}
            id={`zone-${sectionId}-${zone.name}`}
            className="rounded-xl p-4"
            style={{ background: zone.bg }}
          >
            <div className="font-semibold text-sm mb-2" style={{ color: zone.color }}>
              {zone.icon} {zone.name}
            </div>
            <div className="space-y-2">
              {zone.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 mt-0.5">•</span>
                  <div className="flex-1 min-w-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-700 hover:text-[var(--primary)] transition-colors"
                    >
                      {item.title}
                    </a>
                    {item.summary && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.summary}</p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                    item.score >= 9 ? 'badge-must-read' : item.score >= 7 ? 'badge-recommended' : 'badge-worth'
                  }`}>
                    {item.score >= 9 ? '必读' : item.score >= 7 ? '推荐' : '关注'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/digest/HotNewsSection.tsx
git commit -m "feat: 创建 HotNewsSection 热点资讯组件"
```

---

### Task 5: 创建 Sidebar 组件

**Files:**
- Create: `src/components/digest/Sidebar.tsx`

- [ ] **Step 1: 创建组件**

```tsx
// src/components/digest/Sidebar.tsx
'use client';

import { useEffect, useState } from 'react';

interface SidebarProps {
  sections: Array<{ id: string; label: string }>;
  currentDate: string;
  availableDates: string[];
  hasOverseas: boolean;
}

export default function Sidebar({ sections, currentDate, availableDates, hasOverseas }: SidebarProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id || '');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visibleSections = hasOverseas
    ? sections
    : sections.filter(s => s.id !== 'overseas');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );

    visibleSections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [visibleSections.length]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenuOpen(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  const sidebarContent = (
    <>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3">
        <div className="font-bold text-xs text-gray-700 mb-3">📋 本期目录</div>
        {visibleSections.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className={`block w-full text-left text-xs py-1.5 pl-3 mb-0.5 rounded transition ${
              activeSection === id
                ? 'text-[var(--primary)] border-l-2 bg-[#F5F3FF]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeSection === id ? { borderLeftColor: 'var(--primary)' } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="font-bold text-xs text-gray-700 mb-3">📅 历史日报</div>
        {availableDates.slice(0, 7).map(date => (
          <a
            key={date}
            href={`/digest/${date}`}
            className={`block text-xs py-1 ${
              date === currentDate ? 'text-[var(--primary)] font-medium' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {date.slice(5)}{date === today && <span className="text-[var(--primary)] ml-1">← 今天</span>}
          </a>
        ))}
        {availableDates.length > 7 && (
          <a href="/digest" className="text-[10px] text-gray-400 mt-2 block hover:text-gray-600">
            查看更多 ▸
          </a>
        )}
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:block w-[220px] flex-shrink-0 sticky top-4 self-start">
        {sidebarContent}
      </aside>

      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed bottom-6 right-6 w-12 h-12 bg-[var(--primary)] text-white rounded-full shadow-lg flex items-center justify-center text-xl z-50 hover:shadow-xl transition"
        aria-label="目录"
      >
        📋
      </button>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[260px] bg-[var(--bg)] p-4 overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-sm">目录与历史</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 text-lg">✕</button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/digest/Sidebar.tsx
git commit -m "feat: 创建 Sidebar 侧边栏组件（目录+历史+移动端）"
```

---

### Task 6: 创建 DigestContent 主组件

**Files:**
- Create: `src/components/digest/DigestContent.tsx`

- [ ] **Step 1: 创建组件**

```tsx
// src/components/digest/DigestContent.tsx
'use client';

import { DigestData, DigestItem, ZoneItem } from '@/lib/digest-parser';
import Top5Section from './Top5Section';
import GithubSection from './GithubSection';
import HotNewsSection from './HotNewsSection';
import Sidebar from './Sidebar';

interface DigestContentProps {
  data: DigestData;
  availableDates: string[];
}

function groupByOverseasZones(items: DigestItem[]): ZoneItem[] {
  const map = new Map<string, DigestItem[]>();
  for (const item of items) {
    const cat = item.cat || '海外技术';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  return Array.from(map.entries()).map(([name, items]) => ({
    name,
    icon: '🌐',
    color: '#3B82F6',
    bg: '#EFF6FF',
    items,
  }));
}

export default function DigestContent({ data, availableDates }: DigestContentProps) {
  const sections = [
    { id: 'top5', label: '🔥 今日必读 TOP 5' },
    { id: 'github', label: '📊 GitHub Trending' },
    { id: 'overseas', label: '🌍 海外深度' },
    { id: 'hotnews', label: '📡 热点资讯' },
  ];

  return (
    <div>
      <header className="bg-white border-b border-gray-200 px-5 py-3 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'var(--primary)' }}
          >
            D
          </div>
          <span className="font-bold text-base">DevPulse AI</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{data.date}</span>
          <span style={{ color: 'var(--primary)' }}>第 {data.issue} 期</span>
        </div>
      </header>

      <div className="flex max-w-[1200px] mx-auto">
        <main className="flex-1 max-w-[820px] mx-auto p-5 space-y-5">
          <Top5Section items={data.top5} />
          <GithubSection
            daily={data.github.daily}
            weekly={data.github.weekly}
            monthly={data.github.monthly}
            analysis={data.analysis}
          />
          {data.overseas.length > 0 && (
            <HotNewsSection
              zones={groupByOverseasZones(data.overseas)}
              title="海外深度"
              sectionId="overseas"
            />
          )}
          <HotNewsSection zones={data.zones} />
        </main>

        <Sidebar
          sections={sections}
          currentDate={data.date}
          availableDates={availableDates}
          hasOverseas={data.overseas.length > 0}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/digest/DigestContent.tsx
git commit -m "feat: 创建 DigestContent 主组件"
```

---

### Task 7: 创建日报详情页和列表页

**Files:**
- Create: `src/app/digest/[date]/page.tsx`
- Create: `src/app/digest/page.tsx`

- [ ] **Step 1: 创建详情页**

```tsx
// src/app/digest/[date]/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadDigestData, getAvailableDates } from '@/lib/digest-parser';
import DigestContent from '@/components/digest/DigestContent';

interface PageProps {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;
  const data = loadDigestData(date);
  if (!data) return { title: '日报未找到 - DevPulse AI' };
  return {
    title: `DevPulse AI 日报 | ${data.date} 第${data.issue}期`,
    description: `${data.date} 开发者 AI 技术日报，涵盖 GitHub Trending、AI/大模型、热点资讯`,
    openGraph: {
      title: `DevPulse AI 日报 | ${data.date}`,
      description: `第${data.issue}期 · 中文开发者 AI 技术日报`,
      type: 'article',
    },
  };
}

export default async function DigestDatePage({ params }: PageProps) {
  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  const data = loadDigestData(date);
  if (!data) {
    notFound();
  }

  const availableDates = getAvailableDates();

  return <DigestContent data={data} availableDates={availableDates} />;
}
```

- [ ] **Step 2: 创建列表页（跳转到最新）**

```tsx
// src/app/digest/page.tsx
import { redirect } from 'next/navigation';
import { findLatestDate } from '@/lib/digest-parser';

export default function DigestIndexPage() {
  const latest = findLatestDate();
  if (latest) {
    redirect(`/digest/${latest}`);
  }
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <div className="text-6xl mb-4">📭</div>
        <h1 className="text-xl font-bold text-gray-700 mb-2">暂无日报</h1>
        <p className="text-sm text-gray-400">今天的日报还在生成中，请稍后再来</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add src/app/digest/page.tsx "src/app/digest/[date]/page.tsx"
git commit -m "feat: 创建日报页面路由 /digest/[date]"
```

---

### Task 8: 改造企业微信推送为链接模式

**Files:**
- Modify: `devpulse-scripts/server-send.js` lines 602-706

- [ ] **Step 1: 替换 pushDailyReport 函数**

将 `server-send.js` 中第 602-706 行的 `pushDailyReport` 函数整体替换为以下简化版本。保留 `WECHAT_WEBHOOK`、`WECHAT_MAX_BYTES`、`sendWechatChunk` 三个定义不变。

查找并替换（从 `function pushDailyReport(today` 到函数结束的 `}`）：

```javascript
function pushDailyReport(today, weekday, digestItems, repos, summaries) {
  const baseUrl = process.env.SITE_URL || 'https://devpulse.ai';
  const digestUrl = `${baseUrl}/digest/${today}`;
  const msg = `# 📰 DevPulse AI 日报 | ${today} ${weekday}\n\n> 已发送给 ${recipientCount} 位订阅者\n\n[📄 点击阅读完整日报](${digestUrl})`;

  sendWechatChunk(msg);
  console.log(`  ✓ 企业微信推送完成（链接模式）: ${digestUrl}`);
}
```

需要在服务器 `.env` 中新增 `SITE_URL` 环境变量，指向实际域名。

- [ ] **Step 2: 提交**

```bash
git add devpulse-scripts/server-send.js
git commit -m "feat: 企业微信推送改为链接模式"
```

---

### Task 9: 重构现有 API 路由使用共享 parser

**Files:**
- Modify: `src/app/api/community/digest/route.ts`

- [ ] **Step 1: 重构 route.ts**

将 `route.ts` 的内联解析逻辑替换为调用共享 `digest-parser.ts`。保持 API 响应格式不变（向后兼容社区页面）。

```typescript
// src/app/api/community/digest/route.ts
import { NextResponse } from 'next/server';
import { loadDigestData, findLatestDate } from '@/lib/digest-parser';

function getChinaDateStr(): string {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return utc8.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    let date = getChinaDateStr();
    let data = loadDigestData(date);

    if (!data) {
      const latest = findLatestDate();
      if (latest) {
        date = latest;
        data = loadDigestData(date);
      }
    }

    if (!data) {
      return NextResponse.json({ success: true, data: { date, topItems: [], githubItems: [] } });
    }

    return NextResponse.json({
      success: true,
      data: {
        date: data.date,
        topItems: data.top5,
        githubItems: data.github.daily.slice(0, 8),
      },
    });
  } catch (error) {
    console.error('Error fetching digest data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch digest data' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/app/api/community/digest/route.ts
git commit -m "refactor: 社区 API 路由改用共享 digest-parser"
```

---

### Task 10: 验证与部署同步

- [ ] **Step 1: 本地启动验证**

```bash
cd devpulse-saas
npm run dev
```

浏览器打开 `http://localhost:3000/digest` 检查：
1. 是否正确跳转到最新日报
2. 页面布局是否正确（主内容+侧边栏）
3. TOP5、GitHub Tab、热点资讯是否正常渲染
4. 侧边栏目录点击是否平滑滚动
5. 缩小窗口到手机宽度，侧边栏是否折叠为浮动按钮

- [ ] **Step 2: 修复发现的问题**

根据验证结果修复任何渲染或数据解析问题。

- [ ] **Step 3: 同步到服务器**

```bash
scp -r devpulse-saas/ root@124.223.84.104:/home/ubuntu/devpulse-deploy/devpulse-saas/
scp devpulse-scripts/server-send.js root@124.223.84.104:/home/ubuntu/devpulse-deploy/devpulse-scripts/
```

- [ ] **Step 4: 服务器端重启 Next.js**

SSH 到服务器后重启 Next.js 进程使新路由生效。

- [ ] **Step 5: 最终提交**

```bash
git add -A
git commit -m "feat: Web 版日报页面完成，企业微信推送改为链接模式"
```
