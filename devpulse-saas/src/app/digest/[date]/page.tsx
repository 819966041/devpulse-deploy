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
