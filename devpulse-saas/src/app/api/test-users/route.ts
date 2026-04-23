/**
 * 测试用户API
 */
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 模拟用户数据
    const mockUsers = [
      { email: "free@test.com", name: "免费测试用户", plan: "FREE" },
      { email: "pro@test.com", name: "专业测试用户", plan: "PRO" },
      { email: "user1@example.com", name: "用户1", plan: "FREE" },
      { email: "user2@example.com", name: "用户2", plan: "FREE" },
      { email: "qiujie@leadong.com", name: "邱杰", plan: "FREE" },
      { email: "819966041@qq.com", name: "819966041", plan: "FREE" },
      { email: "1422872004@qq.com", name: "1422872004", plan: "FREE" },
      { email: "1263543584@qq.com", name: "1263543584", plan: "FREE" },
      { email: "666666@qq.com", name: "666666", plan: "FREE" },
    ];

    const totalUsers = mockUsers.length;
    const freeUsers = mockUsers.filter(u => u.plan === 'FREE').length;
    const proUsers = mockUsers.filter(u => u.plan === 'PRO').length;

    return NextResponse.json({
      success: true,
      data: {
        users: mockUsers,
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