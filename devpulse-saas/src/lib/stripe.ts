/**
 * Stripe 支付配置与工具函数
 */

import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

// 价格配置
export const PLANS = {
  PRO_MONTHLY: {
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    amount: 2900, // ¥29 = 2900 分
    name: "专业版 · 月付",
    period: "monthly",
  },
  PRO_YEARLY: {
    priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
    amount: 24900, // ¥249 = 24900 分
    name: "专业版 · 年付",
    period: "yearly",
  },
  TEAM_MONTHLY: {
    priceId: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID!,
    amount: 9900, // ¥99
    name: "团队版 · 月付",
    period: "monthly",
  },
} as const;
