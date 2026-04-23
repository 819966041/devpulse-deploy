/**
 * DevPulse AI — 自定义 404 页面
 * 所有未匹配路由的兜底展示
 */
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-2xl font-bold mb-3">页面未找到</h1>
        <p className="text-gray-500 mb-6">
          你访问的页面不存在，可能已被移动或删除
        </p>
        <div className="flex gap-3 justify-center">
          <a
            href="/"
            className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold no-underline hover:shadow-lg"
          >
            返回首页
          </a>
          <a
            href="/demo"
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 no-underline hover:border-[var(--primary)]"
          >
            查看示例日报
          </a>
        </div>
      </div>
    </div>
  );
}
