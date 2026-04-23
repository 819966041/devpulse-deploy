/**
 * 邮件模板生成
 * 精简版 HTML 邮件（保留核心信息，适配多用户推送）
 */

import { DigestItem, GithubRepo } from "./collect";

const COLORS = {
  primary: "#4F46E5",
  secondary: "#7C3AED",
  accent: "#F59E0B",
  bg: "#F0F2F8",
  text: "#1E1B4B",
  muted: "#6B7280",
  border: "#E5E7EB",
};

export function generateDailyEmailHtml(
  date: string,
  weekday: string,
  topItems: DigestItem[],
  githubRepos: GithubRepo[],
  userName: string
): string {
  const issue = getIssueNumber(date);

  let itemsHtml = topItems.slice(0, 10).map((item, i) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${COLORS.border};">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="32" style="vertical-align:top;">
              <div style="width:24px;height:24px;background:${COLORS.primary};border-radius:50%;text-align:center;line-height:24px;color:#fff;font-weight:700;font-size:12px;">${i + 1}</div>
            </td>
            <td style="padding-left:12px;">
              <a href="${item.url}" style="font-size:14px;font-weight:600;color:${COLORS.text};text-decoration:none;">${esc(item.title)}</a>
              ${item.value ? `<span style="margin-left:8px;padding:1px 8px;background:${item.value >= 9 ? "#FEF3C7" : "#E0E7FF"};border-radius:4px;font-size:11px;color:${item.value >= 9 ? "#B45309" : "#4338CA"};font-weight:600;">${item.value >= 9 ? "必读" : "推荐"} ${item.value}</span>` : ""}
              ${item.summary ? `<p style="margin:4px 0 0;font-size:12px;color:${COLORS.muted};line-height:1.5;">${esc(item.summary)}</p>` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join("");

  let ghHtml = githubRepos.slice(0, 5).map((repo) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};">
        <a href="${repo.url}" style="font-size:14px;font-weight:600;color:${COLORS.text};text-decoration:none;font-family:monospace;">${esc(repo.name)}</a>
        <span style="margin-left:8px;font-size:12px;color:${COLORS.muted};">★ ${esc(repo.stars)}</span>
        ${repo.language ? `<span style="margin-left:8px;font-size:11px;color:${COLORS.muted};">${esc(repo.language)}</span>` : ""}
        <p style="margin:4px 0 0;font-size:12px;color:${COLORS.muted};">${esc(repo.description)}</p>
        ${repo.analysis ? `<p style="margin:4px 0 0;font-size:12px;color:${COLORS.primary};">✨ ${esc(repo.analysis.purpose)}</p>` : ""}
      </td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:'PingFang SC','Microsoft YaHei',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};">
  <tr><td align="center" style="padding:24px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;">
      <!-- 头部 -->
      <tr><td style="padding:24px;border-bottom:1px solid ${COLORS.border};">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="display:inline-block;width:32px;height:32px;background:${COLORS.primary};border-radius:8px;text-align:center;line-height:32px;color:#fff;font-weight:700;">D</div>
              <span style="margin-left:10px;font-size:18px;font-weight:700;color:${COLORS.text};">DevPulse AI</span>
            </td>
            <td style="text-align:right;font-size:13px;color:${COLORS.muted};">
              ${date} ${weekday}<br>第 ${issue} 期
            </td>
          </tr>
        </table>
        <p style="margin:12px 0 0;font-size:14px;color:${COLORS.muted};">${userName}，你好！以下是今日精选：</p>
      </td></tr>

      <!-- TOP 热点 -->
      ${itemsHtml ? `<tr><td style="padding:0 24px;"><table width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table></td></tr>` : ""}

      <!-- GitHub Trending -->
      ${ghHtml ? `
      <tr><td style="padding:20px 24px 0;"><h3 style="font-size:16px;color:${COLORS.text};margin:0;">🐙 GitHub Trending</h3></td></tr>
      <tr><td style="padding:0 24px;"><table width="100%" cellpadding="0" cellspacing="0">${ghHtml}</table></td></tr>
      ` : ""}

      <!-- 底部 -->
      <tr><td style="padding:24px;text-align:center;font-size:12px;color:${COLORS.muted};border-top:1px solid ${COLORS.border};">
        DevPulse AI · <a href="#" style="color:${COLORS.muted};">取消订阅</a> · <a href="#" style="color:${COLORS.muted};">设置</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function getIssueNumber(date: string): number {
  const start = new Date("2026-01-01");
  const now = new Date(date);
  return Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
}

function esc(s: string): string {
  return (s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
