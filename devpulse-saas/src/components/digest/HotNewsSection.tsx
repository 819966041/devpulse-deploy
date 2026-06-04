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
