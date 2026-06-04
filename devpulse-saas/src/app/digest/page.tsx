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
