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
