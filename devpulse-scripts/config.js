/**
 * OpenCLI 多平台热点采集 — 配置文件
 */

module.exports = {
  timeout: 25000,
  limit: 15,

  outputDir: require('path').join(__dirname, '..', 'output'),

  // 平台显示顺序（从上到下）
  displayOrder: [
    'weibo', 'zhihu', 'bilibili', '36kr', 'douyin',
    'hackernews', 'devto', 'producthunt', 'v2ex',
    'tieba', 'hupu', 'douban',
  ],

  // 分类映射 — 控制日报板块划分
  sections: [
    { name: '热搜榜', icon: '🔥', categories: ['综合'] },
    { name: '科技与AI', icon: '💡', categories: ['科技'] },
    { name: '开发者社区', icon: '🛠️', categories: ['技术'] },
    { name: '新产品', icon: '🚀', categories: ['产品'] },
    { name: '影娱体育', icon: '🎬', categories: ['娱乐', '体育'] },
    { name: '生活热议', icon: '💬', categories: ['生活'] },
  ],

  platforms: {
    // ===== 需要浏览器登录态 =====
    weibo: {
      name: '微博',
      command: 'weibo hot',
      needAuth: true,
      category: '综合',
      source: '微博热搜',
      fields: {
        title: 'word',
        url: 'url',
        heat: 'hot_value',
        label: 'label',
        category: 'category',
      },
    },
    zhihu: {
      name: '知乎',
      command: 'zhihu hot',
      needAuth: true,
      category: '综合',
      source: '知乎热榜',
      fields: { title: 'title', url: 'url', heat: 'heat' },
    },
    bilibili: {
      name: 'B站',
      command: 'bilibili hot',
      needAuth: true,
      category: '娱乐',
      source: 'B站热门',
      fields: {
        title: 'title',
        author: 'author',
        play: 'play',
        danmaku: 'danmaku',
      },
      buildUrl: (item) => `https://search.bilibili.com/all?keyword=${encodeURIComponent(item.title)}`,
    },
    '36kr': {
      name: '36氪',
      command: '36kr hot',
      needAuth: true,
      category: '科技',
      source: '36氪',
      fields: { title: 'title', url: 'url' },
    },
    douyin: {
      name: '抖音',
      command: 'douyin hashtag hot',
      needAuth: true,
      category: '生活',
      source: '抖音热点',
      fields: { title: 'name', heat: 'view_count', id: 'id' },
      buildUrl: (item) => `https://www.douyin.com/hot/${item.id}`,
    },

    // ===== 无需登录 =====
    hackernews: {
      name: 'HackerNews',
      command: 'hackernews top',
      needAuth: false,
      category: '科技',
      source: 'HackerNews',
      fields: { title: 'title', url: 'url', score: 'score', comments: 'comments' },
    },
    devto: {
      name: 'DEV.to',
      command: 'devto top',
      needAuth: false,
      category: '技术',
      source: 'DEV.to',
      fields: { title: 'title', url: 'url' },
    },
    producthunt: {
      name: 'Product Hunt',
      command: 'producthunt today',
      needAuth: false,
      category: '产品',
      source: 'Product Hunt',
      fields: { title: 'name', subtitle: 'tagline', url: 'url', author: 'author' },
    },
    v2ex: {
      name: 'V2EX',
      command: 'v2ex hot',
      needAuth: false,
      category: '技术',
      source: 'V2EX',
      fields: { title: 'title', url: 'url', replies: 'replies' },
    },
    tieba: {
      name: '贴吧',
      command: 'tieba hot',
      needAuth: false,
      category: '生活',
      source: '贴吧热帖',
      fields: { title: 'title', url: 'url' },
    },
    hupu: {
      name: '虎扑',
      command: 'hupu hot',
      needAuth: true,
      category: '体育',
      source: '虎扑',
      fields: { title: 'title', url: 'url' },
    },
    douban: {
      name: '豆瓣电影',
      command: 'douban movie-hot',
      needAuth: true,
      category: '娱乐',
      source: '豆瓣电影',
      fields: { title: 'title', url: 'url', rating: 'rating', year: 'year' },
    },
  },
};
