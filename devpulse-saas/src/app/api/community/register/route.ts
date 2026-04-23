/**
 * 社区版注册 API — 极简注册
 * POST /api/community/register
 * Body: { name?, email }
 * 自动生成默认密码: devpulse2024
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const DEFAULT_PASSWORD = "devpulse2024";

const schema = z.object({
  email: z.string().email("邮箱格式不正确"),
  name: z.string().min(1).max(50).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name } = schema.parse(body);

    // 检查是否已注册
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { ok: true, message: "该邮箱已注册，可直接登录", userId: existing.id },
        { status: 200 }
      );
    }

    // 用默认密码创建用户
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || email.split("@")[0],
        plan: "FREE",
      },
    });

    // 自动创建邮件订阅
    await prisma.emailSubscription.create({
      data: {
        userId: user.id,
        email: user.email,
        active: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        message: "注册成功！默认密码: " + DEFAULT_PASSWORD,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0].message },
        { status: 400 }
      );
    }
    console.error("社区版注册失败:", err);
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}
