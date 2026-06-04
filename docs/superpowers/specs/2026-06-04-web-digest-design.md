# DevPulse Web 版日报页面设计

**日期**: 2026-06-04
**状态**: 待实现

## 背景

当前企业微信推送的是 Markdown 纯文本摘要（分多条发送，受 4096 字节限制），阅读体验差且无法展示图片。目标是将日报生成为 Web 页面，企业微信只推送链接。

## 决策记录

| 决策点 | 选择 |
|--------|------|
| Web 版 vs 邮件 | 独立设计，充分利用浏览器能力 |
| 页面生成方式 | Next.js 动态路由 `/digest/[date]` |
| 布局风格 | 主内容（~820px）+ 固定侧边栏（220px） |
| 移动端适配 | 侧边栏折叠为右下角浮动目录按钮 |
| 内容版块 | 与邮件版完全一致 |
| 企业微信推送 | 单条链接消息 |

## 路由设计

| 路由 | 说明 |
|------|------|
| `GET /digest/[date]` | 查看指定日期日报，如 `/digest/2026-06-04` |
| `GET /digest` | 日报列表页，跳转到最新一期 |

- 数据来源：复用 `output/` 目录中已有的 markdown/JSON 文件
- 访问控制：无需登录，公开访问
- SEO：服务端渲染，支持 Open Graph 元标签

## 页面结构

### 顶部栏

- DevPulse Logo（indigo "D" 方块 + "DevPulse AI" 文字）
- 右侧：日期 + 星期 + 期号（从 2026-01-01 起算）

### 主内容区（~820px）

四个版块纵向排列，每个版块为白色圆角卡片：

#### 1. 今日必读 TOP 5

- 灰色背景卡片
- 紫色左边框条目，编号圆点 + 标题 + 分类标签 + 分数徽章（必读/推荐/关注）
- 每条包含摘要文本

#### 2. GitHub Trending

- 日/周/月 Tab 切换
- 每个 Repo 卡片包含：
  - 语言色点 + 仓库名（monospace）+ 语言标签 + 热门徽章
  - 右侧星标数
  - 描述文本
  - **OG 图片（280×158）+ AI 深度分析面板** 左右并排
    - AI 分析字段：用途、解决问题、领域、推荐理由、亮点
  - 底部 AI 摘要条 + 评分标签
- 移动端：图片和分析面板自动回退为上下堆叠

#### 3. 海外深度（如有数据）

- 使用与热点资讯相同的渲染组件
- 仅在 `overseas-deep-*-enhanced.md` 存在时显示

#### 4. 热点资讯

- 6 个域的彩色标签：科技（蓝）/ 产品（橙）/ 开发（绿）/ 社会（紫）/ 娱乐（粉）/ 生活（绿）
- 分域卡片展示，每个域内条目含标题 + 分数徽章

### 侧边栏（220px，sticky 固定）

- **本期目录**：列出四个版块，高亮当前阅读位置，点击平滑滚动
- **历史日报**：最近 7 天日期列表 + "查看更多"入口
- 当前日期高亮显示（indigo 色 + "今天"标签）

### 移动端（<768px）

- 侧边栏隐藏，右下角显示浮动目录按钮
- 点击按钮展开目录面板（覆盖层）
- 主内容区全宽
- GitHub 版块图片和分析面板回退为上下堆叠

## 企业微信推送改动

### 当前流程

```
collect → enhance → upload → server-send.js:
  1. 发邮件（HTML）
  2. pushDailyReport() → 拼接 Markdown，分多条推送到企业微信 webhook
```

### 改后流程

```
collect → enhance → upload → server-send.js:
  1. 发邮件（HTML，不变）
  2. pushDailyReport() → 发单条链接消息到企业微信 webhook
     标题："📰 DevPulse AI 日报 | 2026-06-04"
     链接：https://域名/digest/2026-06-04
```

改动范围仅限 `server-send.js` 中的 `pushDailyReport()` 函数：
- 从拼接 Markdown 分多条发送 → 改为发一条包含链接的 Markdown 消息
- Webhook URL 和调用方式不变

## 文件改动清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `devpulse-saas/app/digest/[date]/page.tsx` | 日报详情页（服务端组件） |
| `devpulse-saas/app/digest/page.tsx` | 日报列表页/跳转页 |
| `devpulse-saas/components/digest/DigestContent.tsx` | 日报主内容渲染组件 |
| `devpulse-saas/components/digest/Top5Section.tsx` | 今日必读 TOP5 组件 |
| `devpulse-saas/components/digest/GithubSection.tsx` | GitHub Trending 组件 |
| `devpulse-saas/components/digest/HotNewsSection.tsx` | 热点资讯组件 |
| `devpulse-saas/components/digest/Sidebar.tsx` | 侧边栏组件（目录 + 历史） |
| `devpulse-saas/lib/digest-parser.ts` | Markdown/JSON 数据解析工具 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `devpulse-scripts/server-send.js` | `pushDailyReport()` 改为推送链接 |

## 数据流

```
output/
├── daily-digest-2026-06-04-enhanced.md     → 解析为 TOP5 + 热点资讯数据
├── github-trending-2026-06-04.json          → 解析为 GitHub Trending 数据
├── github-trending-2026-06-04-analysis.json → 解析为 AI 分析数据
└── overseas-deep-2026-06-04-enhanced.md     → 解析为海外深度数据（可选）
         ↓
digest-parser.ts 统一解析
         ↓
Next.js SSR → /digest/2026-06-04
```

解析逻辑复用 `/api/community/digest` 已有的 markdown 解析代码，提取为独立的 `digest-parser.ts` 共享模块。

## 不在本期范围

- 搜索功能
- 暗色模式
- 用户评论/互动
- 邮件模板改动
- RSS feed 改动
