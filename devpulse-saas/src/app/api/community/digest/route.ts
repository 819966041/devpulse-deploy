import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), '..', 'output');

const LANG_COLORS: Record<string, string> = {
  'Python': '#3572A5', 'JavaScript': '#f1e05a', 'TypeScript': '#3178c6',
  'Rust': '#dea584', 'Go': '#00ADD8', 'Java': '#b07219',
  'C++': '#f34b7d', 'C#': '#178600', 'Swift': '#F05138',
  'PHP': '#4F5D95', 'Shell': '#89e051', 'HTML': '#e34c26',
  'Jupyter Notebook': '#DA5B0B', 'Ruby': '#701516',
};

function getChinaDateStr(): string {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return utc8.toISOString().slice(0, 10);
}

function readFile(filename: string): string | null {
  const p = path.join(OUTPUT_DIR, filename);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf-8');
}

function findLatestDate(): string | null {
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

function parseDigestEnhanced(md: string) {
  const items: Array<{
    title: string; url: string; summary: string; score: number;
    cat: string; source: string; tags: string[];
  }> = [];
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

function parseGithubRaw(md: string) {
  const items: Array<{
    title: string; url: string; description: string;
    language: string; color: string; stars: number;
  }> = [];
  const lines = md.split('\n');

  for (const line of lines) {
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

export async function GET() {
  try {
    const todayChina = getChinaDateStr();
    let date = todayChina;

    let digestMd = readFile(`daily-digest-${date}-enhanced.md`);
    let githubMd = readFile(`github-trending-${date}.md`);

    if (!digestMd && !githubMd) {
      const latest = findLatestDate();
      if (latest) {
        date = latest;
        digestMd = readFile(`daily-digest-${date}-enhanced.md`);
        githubMd = readFile(`github-trending-${date}.md`);
      }
    }

    let topItems: Array<{
      title: string; url: string; summary: string;
      score: number; cat: string; source: string; tags: string[];
    }> = [];

    if (digestMd) {
      const allItems = parseDigestEnhanced(digestMd);
      allItems.sort((a, b) => b.score - a.score);
      const selected: typeof allItems = [];
      const usedCats = new Set<string>();
      for (const item of allItems) {
        if (selected.length >= 5) break;
        if (!usedCats.has(item.cat)) {
          selected.push(item);
          usedCats.add(item.cat);
        }
      }
      for (const item of allItems) {
        if (selected.length >= 5) break;
        if (!selected.includes(item)) selected.push(item);
      }
      selected.sort((a, b) => b.score - a.score);
      topItems = selected;
    }

    let githubItems: Array<{
      title: string; url: string; description: string;
      language: string; color: string; stars: number;
    }> = [];

    if (githubMd) {
      const lines = githubMd.split('\n');
      let inDaily = false;
      let dailyLines = '';
      for (const line of lines) {
        if (line.match(/^###\s+今日/)) { inDaily = true; continue; }
        if (line.match(/^###\s+(本周|本月)/)) { inDaily = false; continue; }
        if (inDaily) dailyLines += line + '\n';
      }
      githubItems = parseGithubRaw(dailyLines || githubMd).slice(0, 8);
    }

    return NextResponse.json({
      success: true,
      data: {
        date,
        topItems,
        githubItems,
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
