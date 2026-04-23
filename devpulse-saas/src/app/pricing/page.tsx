/**
 * DevPulse AI — 独立定价页
 * 支持月付/年付切换
 */
"use client";

import { useState } from "react";

// ========== 套餐配置 ==========
interface PlanConfig {
  key: string;
  name: string;
  desc: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyOriginal: number;
  features: string[];
  disabled: string[];
  cta: string;
  popular?: boolean;
}

const plans: PlanConfig[] = [
  {
    key: "FREE",
    name: "免费版",
    desc: "永久免费，体验核心功能",
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyOriginal: 0,
    features: [
      "✅ 延迟24h 日报浏览",
      "✅ 5个公开平台聚合",
      "✅ RSS 订阅",
      "✅ 基础搜索",
    ],
    disabled: [
      "❌ AI 智能摘要评分",
      "❌ 每日邮件推送",
      "❌ REST API 接口",
      "❌ GitHub 深度解读",
    ],
    cta: "免费开始",
  },
  {
    key: "PRO",
    name: "专业版",
    desc: "个人开发者首选",
    monthlyPrice: 29,
    yearlyPrice: 288,
    yearlyOriginal: 348,
    features: [
      "✅ 实时日报推送",
      "✅ 12+ 全平台覆盖",
      "✅ AI 摘要 + 10分制评分",
      "✅ 每日邮件推送",
      "✅ GitHub 深度解读",
      "✅ REST API 接口",
      "✅ 30天历史数据",
      "✅ 自定义关注领域",
    ],
    disabled: [],
    cta: "立即订阅",
    popular: true,
  },
  {
    key: "TEAM",
    name: "团队版",
    desc: "技术团队共享协作",
    monthlyPrice: 99,
    yearlyPrice: 988,
    yearlyOriginal: 1188,
    features: [
      "✅ 专业版全部功能",
      "✅ 最多 10 人共享",
      "✅ 高频 API 调用（10x）",
      "✅ 全部历史数据",
      "✅ 团队协作标注",
      "✅ 优先客服支持",
      "✅ 自定义 Webhook",
      "✅ 数据导出 (CSV/JSON)",
    ],
    disabled: [],
    cta: "联系我们",
  },
];

const faqs = [
  { q: "支持哪些支付方式？", a: "目前支持 Stripe（Visa/Mastercard 信用卡）和微信支付。支付宝即将上线。" },
  { q: "可以随时取消订阅吗？", a: "当然可以！随时在仪表盘中一键取消，当前计费周期内仍然可以使用所有功能。" },
  { q: "年付和月付有什么区别？", a: "年付享受约 8 折优惠，且锁定当前价格不受后续调价影响。" },
  { q: "API 有调用限制吗？", a: "专业版每天 1000 次请求，团队版每天 10000 次。超出后不会额外收费，会返回 429 状态码。" },
  { q: "团队版如何管理成员？", a: "在仪表盘的团队管理页面，可以邀请/移除成员（邮箱邀请），最多 10 人。" },
];

// ========== 主组件 ==========
export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  function handleCta(plan: PlanConfig) {
    if (plan.key === "FREE") {
      window.location.href = "/login";
    } else if (plan.key === "TEAM") {
      window.location.href = "mailto:support@devpulse.ai?subject=团队版咨询";
    } else {
      window.location.href = "/login";
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* 标题 */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold mb-3">简单透明的定价</h1>
        <p className="text-gray-500">选择适合你的方案，随时升级或降级</p>
      </div>

      {/* 月付/年付切换 */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span className={`text-sm font-medium ${!isYearly ? "text-[var(--text)]" : "text-gray-400"}`}>
          月付
        </span>
        <button
          onClick={() => setIsYearly(!isYearly)}
          className={`relative w-12 h-6 rounded-full transition-colors ${isYearly ? "bg-[var(--primary)]" : "bg-gray-300"}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isYearly ? "translate-x-6" : "translate-x-0.5"}`} />
        </button>
        <span className={`text-sm font-medium ${isYearly ? "text-[var(--text)]" : "text-gray-400"}`}>
          年付
        </span>
        {isYearly && (
          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
            省 ~20%
          </span>
        )}
      </div>

      {/* 套餐卡片 */}
      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {plans.map((plan) => {
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const originalPrice = isYearly ? plan.yearlyOriginal : undefined;
          const isFree = plan.key === "FREE";

          return (
            <div
              key={plan.key}
              className={`bg-white rounded-2xl p-6 relative ${
                plan.popular ? "border-2 border-[var(--primary)] shadow-lg" : "border border-gray-200"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[var(--primary)] text-white text-xs rounded-full font-semibold">
                  最受欢迎
                </div>
              )}
              <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
              <p className="text-sm text-gray-400 mb-4">{plan.desc}</p>
              <div className="mb-6">
                {isFree ? (
                  <div className="text-3xl font-extrabold">¥0<span className="text-sm font-normal text-gray-400">/月</span></div>
                ) : (
                  <>
                    <div className="text-3xl font-extrabold">¥{price}<span className="text-sm font-normal text-gray-400">/{isYearly ? "年" : "月"}</span></div>
                    {originalPrice && originalPrice > price && (
                      <div className="text-sm text-gray-400 line-through mt-1">原价 ¥{originalPrice}/{isYearly ? "年" : "月"}</div>
                    )}
                    {!isYearly && plan.key === "PRO" && (
                      <div className="text-xs text-[var(--accent)] font-semibold mt-1">🔥 早鸟价（原价 ¥49/月）</div>
                    )}
                  </>
                )}
              </div>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                {plan.features.map((f, i) => <li key={i}>{f}</li>)}
                {plan.disabled.map((f, i) => <li key={i} className="text-gray-300">{f}</li>)}
              </ul>
              <button
                onClick={() => handleCta(plan)}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
                  plan.popular
                    ? "bg-[var(--primary)] text-white hover:shadow-lg"
                    : "border border-gray-300 text-gray-600 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* 功能对比表 */}
      <div className="mb-16">
        <h2 className="text-xl font-bold text-center mb-8">详细功能对比</h2>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">功能</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">免费版</th>
                <th className="text-center py-3 px-4 font-semibold text-[var(--primary)]">专业版</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">团队版</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "平台覆盖", free: "5个", pro: "12+全平台", team: "12+全平台" },
                { name: "日报时效", free: "延迟24h", pro: "实时", team: "实时" },
                { name: "AI 摘要评分", free: "—", pro: "✅", team: "✅" },
                { name: "邮件推送", free: "—", pro: "✅", team: "✅" },
                { name: "REST API", free: "—", pro: "1000次/天", team: "10000次/天" },
                { name: "历史数据", free: "7天", pro: "30天", team: "全部" },
                { name: "GitHub 深度解读", free: "—", pro: "✅", team: "✅" },
                { name: "团队协作", free: "—", pro: "—", team: "最多10人" },
                { name: "数据导出", free: "—", pro: "—", team: "✅" },
                { name: "客服支持", free: "社区", pro: "工单", team: "优先" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 px-4 text-gray-700">{row.name}</td>
                  <td className="py-3 px-4 text-center text-gray-400">{row.free}</td>
                  <td className="py-3 px-4 text-center text-gray-700 font-medium">{row.pro}</td>
                  <td className="py-3 px-4 text-center text-gray-700">{row.team}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-center mb-8">常见问题</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <span className="font-medium text-sm">{faq.q}</span>
                <span className={`text-gray-400 transition-transform ${expandedFaq === i ? "rotate-180" : ""}`}>▼</span>
              </button>
              {expandedFaq === i && (
                <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 底部 */}
      <div className="text-center mt-16">
        <p className="text-gray-400 text-sm mb-4">
          还有疑问？发邮件到{" "}
          <a href="mailto:support@devpulse.ai" className="text-[var(--primary)] no-underline">support@devpulse.ai</a>
        </p>
      </div>
    </div>
  );
}
