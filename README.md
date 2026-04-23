# DevPulse AI

AI 驱动的技术日报平台，每日自动采集、增强并推送技术热点摘要。

## 项目结构

```
devpulse-deploy/
├── devpulse-scripts/       数据采集与邮件发送脚本 (Node.js)
│   ├── send-digest.js      邮件发送主程序
│   ├── daily-digest.js     日报生成
│   ├── github-trending.js  GitHub 趋势采集
│   ├── enhance-digest.js   AI 语义增强 (GLM/Kimi)
│   ├── scrapling-deep.py   海外深度资讯爬虫
│   ├── email-config.js     SMTP 配置
│   ├── config.js           通用配置
│   ├── kimi-config.js      Kimi API 配置
│   ├── publish-pages.js    页面发布
│   ├── logger.js           日志工具
│   ├── utils.js            通用工具函数
│   └── run-now.sh          一键运行脚本
│
├── devpulse-saas/          SaaS Web 应用 (Next.js 15)
│   ├── src/
│   │   ├── app/            页面与 API 路由
│   │   │   ├── community/  社区日报页
│   │   │   ├── dashboard/  用户仪表盘
│   │   │   ├── login/      登录
│   │   │   ├── pricing/    定价页
│   │   │   └── api/        后端 API
│   │   ├── lib/            核心模块 (认证/邮件/数据库/Stripe)
│   │   └── middleware.ts   NextAuth 路由守卫
│   ├── prisma/
│   │   ├── schema.prisma   数据库模型
│   │   └── seed.ts         种子数据
│   ├── scripts/            运维脚本
│   └── data/               示例数据
│
└── devpulse-scripts.bak-417/  历史版本备份
```

## 技术栈

| 组件 | 技术 |
|------|------|
| Web 框架 | Next.js 15 (App Router) + React 19 |
| 语言 | TypeScript / JavaScript / Python |
| 数据库 | SQLite (Prisma ORM) |
| 认证 | NextAuth v4 |
| 支付 | Stripe |
| 样式 | TailwindCSS v4 |
| 邮件 | Nodemailer |
| AI | GLM-4.5-Air (智谱) / Kimi (月之暗面) |

## 快速开始

### 环境要求

- Node.js 18+
- npm

### 1. 安装依赖

```bash
# SaaS 应用
cd devpulse-saas && npm install

# 采集脚本
cd devpulse-scripts && npm install
```

### 2. 配置环境变量

复制 `.env` 模板并填入你的配置：

**devpulse-scripts/.env**
```
GLM_API_KEY=your_glm_api_key
KIMI_API_KEY=your_kimi_api_key
SMTP_USER=your_email@example.com
SMTP_PASS=your_smtp_password
MAIL_TO=recipient1@example.com,recipient2@example.com
```

**devpulse-saas/.env**
```
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=file:./dev.db
GLM_API_KEY=your_glm_api_key
KIMI_API_KEY=your_kimi_api_key
SMTP_USER=your_email@example.com
SMTP_PASS=your_smtp_password
MAIL_FROM=your_email@example.com
```

### 3. 初始化数据库

```bash
cd devpulse-saas
npx prisma db push
npx prisma db seed
```

### 4. 启动开发服务器

```bash
cd devpulse-saas
npm run dev
```

访问 http://localhost:3000

## 功能

- **AI 日报生成** — 自动采集 GitHub Trending、海外技术资讯，AI 语义增强后生成每日摘要
- **邮件推送** — 定时发送技术日报到订阅者邮箱
- **社区页** — 公开访问的日报阅读页面
- **SaaS 仪表盘** — 用户管理、订阅、API Key 管理
- **多模式** — 支持 SaaS（完整功能）和 Community（极简免费）两种运行模式

## License

MIT
