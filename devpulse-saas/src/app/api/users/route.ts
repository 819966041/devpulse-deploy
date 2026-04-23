/**
 * 获取用户列表 API
 * GET /api/users
 * 查询所有注册用户的邮箱和信息
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 获取所有用户列表
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 统计信息
    const totalUsers = users.length;
    const freeUsers = users.filter(u => u.plan === 'FREE').length;
    const proUsers = users.filter(u => u.plan === 'PRO').length;

    return NextResponse.json({
      success: true,
      data: {
        users,
        stats: {
          totalUsers,
          freeUsers,
          proUsers,
        }
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}