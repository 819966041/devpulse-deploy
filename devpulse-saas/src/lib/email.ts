/**
 * 邮件发送工具
 * 基于 Nodemailer，改造自原 send-digest.js
 */

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.qq.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE !== "false",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({
      from: `"DevPulse AI" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error(`邮件发送失败 [${to}]:`, err);
    return false;
  }
}

export async function verifySmtp() {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
