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
