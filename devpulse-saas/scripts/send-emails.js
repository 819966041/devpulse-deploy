/**
 * 邮件推送脚本
 * 读取当日数据 → 查询活跃订阅用户 → 逐个发送
 * 用法: node scripts/send-emails.js
 */

const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const today = new Date().toISOString().slice(0, 10);
const dataDir = path.join(__dirname, "..", "data");
const dataFile = path.join(dataDir, `${today}.json`);

if (!fs.existsSync(dataFile)) {
  console.log(`  无数据文件: ${dataFile}`);
  process.exit(0);
}

const report = JSON.parse(fs.readFileSync(dataFile, "utf-8"));

// SMTP 配置
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.qq.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * 解析 enhanced markdown 提取 TOP 5
 */
function parseTop5(md) {
  if (!md) return [];
  const items = [];
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^-\s*\[([^\]]+)\]\(([^)]+)\)/);
    if (m) {
      let summary = "", value = 5;
      if (i + 1 < lines.length) {
        const sm = lines[i + 1].match(/^>\s*(.+?)\s*[·]\s*(\d+)\/\d+/);
        if (sm) { summary = sm[1].trim(); value = parseInt(sm[2]); }
      }
      items.push({ title: m[1], url: m[2], summary, value });
    }
    if (items.length >= 10) break;
  }
  return items.sort((a, b) => b.value - a.value).slice(0, 5);
}

const top5 = parseTop5(report.digest);

if (top5.length === 0) {
  console.log("  无足够内容发送邮件");
  process.exit(0);
}

// 生成简洁邮件 HTML
function generateHtml(items, date) {
  const itemsHtml = items.map((item, i) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #eee;">
        <div style="display:inline-block;width:22px;height:22px;background:#4F46E5;border-radius:50%;text-align:center;line-height:22px;color:#fff;font-weight:700;font-size:11px;">${i + 1}</div>
        <a href="${item.url}" style="margin-left:8px;font-size:14px;font-weight:600;color:#1E1B4B;text-decoration:none;">${item.title}</a>
        <span style="margin-left:6px;padding:1px 6px;background:${item.value >= 9 ? "#FEF3C7" : "#E0E7FF"};border-radius:3px;font-size:10px;color:${item.value >= 9 ? "#B45309" : "#4338CA"};font-weight:600;">${item.value}</span>
        ${item.summary ? `<p style="margin:4px 0 0 30px;font-size:12px;color:#6B7280;">${item.summary}</p>` : ""}
      </td>
    </tr>
  `).join("");

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F0F2F8;font-family:'PingFang SC','Microsoft YaHei',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F8;"><tr><td align="center" style="padding:24px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
<tr><td style="padding:20px 24px;border-bottom:1px solid #eee;">
  <span style="display:inline-block;width:28px;height:28px;background:#4F46E5;border-radius:7px;text-align:center;line-height:28px;color:#fff;font-weight:700;">D</span>
  <span style="margin-left:8px;font-size:16px;font-weight:700;color:#1E1B4B;">DevPulse AI</span>
  <span style="float:right;font-size:12px;color:#9CA3AF;">${date}</span>
</td></tr>
<tr><td style="padding:20px 24px;"><h3 style="font-size:15px;color:#1E1B4B;margin:0 0 4px;">🔥 今日必读</h3><p style="font-size:12px;color:#9CA3AF;margin:0;">AI 从200+条资讯中精选</p></td></tr>
<tr><td style="padding:0 24px;"><table width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table></td></tr>
<tr><td style="padding:20px 24px;text-align:center;">
  <a href="https://your-domain.com/dashboard" style="display:inline-block;padding:8px 24px;background:#4F46E5;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">查看完整日报 →</a>
</td></tr>
<tr><td style="padding:16px;text-align:center;font-size:11px;color:#9CA3AF;border-top:1px solid #eee;">
  DevPulse AI · <a href="#" style="color:#9CA3AF;">取消订阅</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

// 读取订阅用户列表（MVP: 从 data/subscribers.json 读取）
const subFile = path.join(dataDir, "subscribers.json");
let subscribers = [];
if (fs.existsSync(subFile)) {
  subscribers = JSON.parse(fs.readFileSync(subFile, "utf-8"));
}

// 如果没有订阅文件，发送给默认邮箱
if (subscribers.length === 0 && process.env.SMTP_USER) {
  subscribers = [{ email: process.env.SMTP_USER, name: "测试用户" }];
}

async function sendAll() {
  const html = generateHtml(top5, today);
  let sent = 0;

  for (const sub of subscribers) {
    try {
      await transporter.sendMail({
        from: `"DevPulse AI" <${process.env.SMTP_USER}>`,
        to: sub.email,
        subject: `DevPulse AI | ${today} 今日必读 TOP 5`,
        html,
      });
      sent++;
      console.log(`  ✓ ${sub.email}`);
    } catch (e) {
      console.log(`  ✗ ${sub.email}: ${e.message}`);
    }
  }

  console.log(`\n  共发送 ${sent}/${subscribers.length} 封`);
}

sendAll().catch(console.error);
