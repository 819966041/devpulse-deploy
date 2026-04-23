/**
 * 仪表盘布局 — 侧边栏导航
 */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex gap-6">
        {/* 侧边栏 */}
        <aside className="w-48 flex-shrink-0">
          <nav className="sticky top-20 space-y-1">
            {[
              { href: "/dashboard", label: "今日日报", icon: "📰" },
              { href: "/dashboard/github", label: "GitHub Trending", icon: "🐙" },
              { href: "/dashboard/history", label: "历史日报", icon: "📅" },
              { href: "/dashboard/settings", label: "账户设置", icon: "⚙️" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 no-underline hover:bg-gray-100 hover:text-[var(--primary)] transition"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </aside>

        {/* 主内容 */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
