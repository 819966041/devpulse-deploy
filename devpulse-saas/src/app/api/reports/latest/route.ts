/**
 * 最新日报 API
 * GET /api/reports/latest
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const plan = (session?.user as any)?.plan || "FREE";

  // 免费用户看到3天前的
  const whereClause = plan === "FREE"
    ? { type: "DIGEST" as const, date: { lte: getFreeDateLimit() } }
    : { type: "DIGEST" as const };

  const report = await prisma.dailyReport.findFirst({
    where: whereClause,
    orderBy: { date: "desc" },
  });

  if (!report) {
    return NextResponse.json({ error: "暂无日报数据" }, { status: 404 });
  }

  let data = JSON.parse(report.data);
  if (plan === "FREE") {
    data = data.map((item: any) => ({
      title: item.title,
      url: item.url,
      source: item.source,
      category: item.category,
    }));
  }

  return NextResponse.json({ date: report.date, data });
}

function getFreeDateLimit(): string {
  const d = new Date();
  d.setDate(d.getDate() - 3);
  return d.toISOString().slice(0, 10);
}
