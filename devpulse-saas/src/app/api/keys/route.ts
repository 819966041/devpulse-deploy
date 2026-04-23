/**
 * API 密钥管理
 * GET  /api/keys      — 列出当前用户的密钥
 * POST /api/keys      — 创建新密钥
 * DELETE /api/keys    — 删除密钥
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// 生成 API 密钥: dp_live_xxxxxxxxxxxxxxxx
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = crypto.randomBytes(24).toString("hex");
  const key = `dp_live_${raw}`;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  const prefix = key.slice(0, 12);
  return { key, hash, prefix };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const keys = await prisma.apiKey.findMany({
    where: { userId },
    select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const plan = (session.user as any).plan;

  if (plan === "FREE") {
    return NextResponse.json({ error: "API 密钥为专业版功能", upgrade: true }, { status: 403 });
  }

  // 限制最多5个密钥
  const count = await prisma.apiKey.count({ where: { userId } });
  if (count >= 5) {
    return NextResponse.json({ error: "最多创建5个API密钥" }, { status: 400 });
  }

  const { name } = await req.json();
  const { key, hash, prefix } = generateApiKey();

  await prisma.apiKey.create({
    data: { userId, name: name || "Default", keyHash: hash, keyPrefix: prefix },
  });

  // 只在创建时返回完整密钥
  return NextResponse.json({ key, prefix, name }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { id } = await req.json();

  const key = await prisma.apiKey.findFirst({ where: { id, userId } });
  if (!key) {
    return NextResponse.json({ error: "密钥不存在" }, { status: 404 });
  }

  await prisma.apiKey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
