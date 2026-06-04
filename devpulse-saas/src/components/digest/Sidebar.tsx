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
