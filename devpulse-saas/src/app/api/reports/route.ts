/**
 * DevPulse AI — 日报数据 API
 *
 * GET  /api/reports          → 获取最近 N 天日报列表
 * GET  /api/reports?date=YYYY-MM-DD&type=DIGEST  → 获取指定日期日报
 * GET  /api/reports?recent=7&type=DIGEST         → 最近 7 天
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const type = searchParams.get("type") || "DIGEST";
    const recent = parseInt(searchParams.get("recent") || "7", 10);
    const limit = Math.min(recent, 30); // 最多 30 天

    // 获取单日日报
    if (date) {
      const report = await prisma.dailyReport.findUnique({
        where: { date_type: { date, type: type as "DIGEST" | "GITHUB_TRENDING" | "OVERSEAS_DEEP" } },
      });

      if (!report) {
        return NextResponse.json(
          { error: "当日日报暂未生成", date, type },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ...report,
        data: JSON.parse(report.data),
      });
    }

    // 获取最近 N 天日报
    const reports = await prisma.dailyReport.findMany({
      where: { type: type as "DIGEST" | "GITHUB_TRENDING" | "OVERSEAS_DEEP" },
      orderBy: { date: "desc" },
      take: limit,
    });

    return NextResponse.json(
      reports.map((r) => ({
        ...r,
        data: JSON.parse(r.data),
      }))
    );
  } catch (error) {
    console.error("[api/reports] Error:", error);
    return NextResponse.json(
      { error: "获取日报失败" },
      { status: 500 }
    );
  }
}
