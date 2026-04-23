/**
 * 邮件订阅 API
 * POST /api/subscribe   — 订阅
 * DELETE /api/subscribe  — 取消订阅
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  // Pro/Team 才能订阅邮件
  if (user.plan === "FREE") {
    return NextResponse.json(
      { error: "邮件推送为专业版功能", upgrade: true },
      { status: 403 }
    );
  }

  const existing = await prisma.emailSubscription.findFirst({
    where: { userId: user.id },
  });

  if (existing) {
    await prisma.emailSubscription.update({
      where: { id: existing.id },
      data: { active: true },
    });
  } else {
    await prisma.emailSubscription.create({
      data: { userId: user.id, email: user.email, active: true },
    });
  }

  return NextResponse.json({ ok: true, message: "订阅成功" });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  await prisma.emailSubscription.updateMany({
    where: { userId: user.id },
    data: { active: false },
  });

  return NextResponse.json({ ok: true, message: "已取消订阅" });
}
