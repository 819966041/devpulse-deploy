/**
 * 指定日期日报 API
 * GET /api/reports/[date]?type=digest
 * 
 * 免费用户：只能看3天前的数据
 * Pro/Team：可看所有数据
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const type = req.nextUrl.searchParams.get("type") || "DIGEST";

  // 验证日期格式
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "日期格式应为 YYYY-MM-DD" }, { status: 400 });
  }

  // 检查用户权限
  const session = await getServerSession(authOptions);
  const plan = (session?.user as any)?.plan || "FREE";

  // 免费用户延迟24h
  if (plan === "FREE") {
    const reportDate = new Date(date);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    if (reportDate > threeDaysAgo) {
      return NextResponse.json(
        { error: "免费版仅可查看3天前的数据，升级专业版获取实时内容", upgrade: true },
        { status: 403 }
      );
    }
  }

  // 查询日报
  const report = await prisma.dailyReport.findUnique({
    where: {
      date_type: { date, type: type.toUpperCase() as any },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "该日期暂无数据" }, { status: 404 });
  }

  // 免费用户去掉 AI 评分和摘要
  let data = JSON.parse(report.data);
  if (plan === "FREE") {
    data = stripPremiumFields(data);
  }

  return NextResponse.json({ date: report.date, type: report.type, data });
}

function stripPremiumFields(data: any): any {
  if (Array.isArray(data)) {
    return data.map((item: any) => ({
      title: item.title,
      url: item.url,
      source: item.source,
      category: item.category,
      // 去掉 AI 评分和摘要
    }));
  }
  return data;
}
