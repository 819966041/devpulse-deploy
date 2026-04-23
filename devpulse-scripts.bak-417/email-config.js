/**
 * 邮件配置 — 敏感信息从 .env 读取
 */

require('dotenv').config();

module.exports = {
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.qq.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
  to: process.env.MAIL_TO || process.env.SMTP_USER,
  from: `"DevPulse AI" <${process.env.SMTP_USER}>`,
};
