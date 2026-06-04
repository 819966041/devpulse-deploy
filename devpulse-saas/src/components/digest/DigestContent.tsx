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
