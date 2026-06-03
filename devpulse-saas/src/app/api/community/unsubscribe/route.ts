/**
 * 社区版退订 API
 * POST /api/community/unsubscribe
 * Body: { email }
 * 无需登录 — 邮件退订标准流程
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email("邮箱格式不正确"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    // 查找该邮箱的活跃订阅
    const subscription = await prisma.emailSubscription.findFirst({
      where: { email, active: true },
    });

    if (!subscription) {
      return NextResponse.json(
        { ok: true, message: "该邮箱未订阅或已退订" },
        { status: 200 }
      );
    }

    await prisma.emailSubscription.update({
      where: { id: subscription.id },
      data: { active: false },
    });

    return NextResponse.json(
      { ok: true, message: "退订成功，你将不再收到每日推送" },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0].message },
        { status: 400 }
      );
    }
    console.error("退订失败:", err);
    return NextResponse.json(
      { error: "退订失败，请稍后重试" },
      { status: 500 }
    );
  }
}
