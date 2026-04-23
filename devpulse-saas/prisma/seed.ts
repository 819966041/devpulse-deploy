/**
 * Prisma 数据库种子脚本
 * 用法: npx tsx prisma/seed.ts
 * 
 * 创建测试用户 + 示例日报数据
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 开始种子数据...\n");

  // 创建测试用户
  const passwordHash = await bcrypt.hash("123456", 10);

  const freeUser = await prisma.user.upsert({
    where: { email: "free@test.com" },
    update: {},
    create: {
      email: "free@test.com",
      name: "免费测试用户",
      passwordHash,
      plan: "FREE",
    },
  });
  console.log(`  ✓ 免费用户: ${freeUser.email}`);

  const proUser = await prisma.user.upsert({
    where: { email: "pro@test.com" },
    update: {},
    create: {
      email: "pro@test.com",
      name: "专业版测试用户",
      passwordHash,
      plan: "PRO",
      stripeCustomerId: "cus_test_pro",
    },
  });
  console.log(`  ✓ 专业用户: ${proUser.email}`);

  // 创建示例日报数据
  const today = new Date().toISOString().slice(0, 10);
  const sampleDigest = [
    {
      title: "斯坦福423页AI报告出炉，中美差距仅2.7%",
      url: "https://36kr.com/p/example1",
      source: "36氪",
      category: "AI/大模型",
      summary: "斯坦福发布AI指数报告，中美AI差距缩小至2.7%",
      value: 9,
    },
    {
      title: "Claude Code Routines — AI编程工作流革命",
      url: "https://code.claude.com/docs/en/routines",
      source: "HackerNews",
      category: "编程工具",
      summary: "Anthropic发布Claude Code Routines",
      value: 8,
    },
    {
      title: "Orange Pi 6 Plus 评测",
      url: "https://example.com/orangepi",
      source: "DEV.to",
      category: "硬件",
      summary: "新一代ARM单板机性能评测",
      value: 7,
    },
    {
      title: "5NF and Database Design",
      url: "https://example.com/db-design",
      source: "HackerNews",
      category: "后端/数据库",
      summary: "5NF和数据库设计讨论",
      value: 7,
    },
    {
      title: "Stop Flock",
      url: "https://stopflock.com",
      source: "Product Hunt",
      category: "编程工具",
      summary: "一个新工具或服务",
      value: 5,
    },
  ];

  await prisma.dailyReport.upsert({
    where: { date_type: { date: today, type: "DIGEST" } },
    update: {},
    create: {
      date: today,
      type: "DIGEST",
      data: JSON.stringify(sampleDigest),
    },
  });
  console.log(`  ✓ 示例日报: ${today}`);

  // 创建邮件订阅
  await prisma.emailSubscription.upsert({
    where: { id: "sub_pro" },
    update: {},
    create: {
      id: "sub_pro",
      userId: proUser.id,
      email: proUser.email,
      active: true,
    },
  });
  console.log(`  ✓ 邮件订阅: ${proUser.email}`);

  console.log("\n✅ 种子数据完成！");
  console.log("\n测试账号:");
  console.log("  免费版: free@test.com / 123456");
  console.log("  专业版: pro@test.com / 123456");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
