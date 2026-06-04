import { NextResponse } from 'next/server';
import { loadDigestData, findLatestDate } from '@/lib/digest-parser';

function getChinaDateStr(): string {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return utc8.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    let date = getChinaDateStr();
    let data = loadDigestData(date);

    if (!data) {
      const latest = findLatestDate();
      if (latest) {
        date = latest;
        data = loadDigestData(date);
      }
    }

    if (!data) {
      return NextResponse.json({ success: true, data: { date, topItems: [], githubItems: [] } });
    }

    return NextResponse.json({
      success: true,
      data: {
        date: data.date,
        topItems: data.top5,
        githubItems: data.github.daily.slice(0, 8),
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
