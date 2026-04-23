# devpulse-deploy

DevPulse AI 技术日报本地工作目录，配套服务器自动发件链路。

> **2026-04-23 完成单主目录迁移**：服务器端从「`/root/devpulse-deploy` + `/home/ubuntu/devpulse-deploy/devpulse-saas`」跨主目录的混乱布局，统一收敛到 **`/home/ubuntu/devpulse-deploy/`** 单一主目录下。本地 `devpulse.ps1` 已同步更新远程路径，邮件链路实测通过。

---

## 三段式架构

```
┌──────────────────────────────────────────────────────────────────────┐
│  本地（Windows）                                                      │
│                                                                      │
│  D:\tools\opencli-extension\                                         │
│      └─ scripts\send-digest.js --collect                             │
│         产出 markdown → output\daily-digest-YYYY-MM-DD.md            │
│                                                                      │
│              │ devpulse.ps1 (本仓库根目录)                             │
│              ▼                                                       │
│  [1/3] node send-digest.js --collect      （在 opencli-extension 跑） │
│  [2/3] scp output\*<today>* → 服务器                                  │
│  [3/3] ssh root@<server> 触发服务器发件                                │
│                                                                      │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  服务器 124.223.84.104                                                │
│                                                                      │
│  /home/ubuntu/devpulse-deploy/        ←── 唯一主目录                  │
│  ├── output/                              （scp 上传到这里）          │
│  ├── .sent-flags/                         （今日已发送标记）           │
│  ├── devpulse-scripts/                    （ssh 触发 server-send.js）  │
│  │   └── .env                             ★ 发件 SMTP/GLM/KIMI 凭据   │
│  └── devpulse-saas/                       （Next.js next dev :3000）  │
│      ├── prisma/dev.db                    ★ 唯一权威订阅者数据库 ★    │
│      └── .env                             网站 NEXTAUTH/DATABASE_URL  │
│                                                                      │
│  执行链：ssh root@... → cd /home/ubuntu/.../scripts                   │
│         → source /root/.nvm/nvm.sh （node 装在 root 下）              │
│         → node server-send.js --now                                   │
│         dotenv 在 cwd（ubuntu/scripts）读 .env                        │
│         server-send.js 内部硬编码 SAAS_ROOT 读 saas/prisma/dev.db     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 服务器目录布局（迁移后）

```
/home/ubuntu/devpulse-deploy/
├── devpulse-saas/             820M   Next.js 网站 + Prisma + 真生产数据库
│   ├── prisma/
│   │   ├── dev.db             ★ 订阅者数据库（唯一权威）
│   │   ├── dev.db.bak-*       数据库备份
│   │   └── schema.prisma
│   ├── .env                   网站用 .env（NEXT_PUBLIC_*/NEXTAUTH/DATABASE_URL/SMTP）
│   ├── src/  scripts/  node_modules/  .next/  ...
│   └── package.json
│
├── devpulse-scripts/          1.1M   邮件发送脚本
│   ├── server-send.js         ★ 主程序（ssh 触发它）
│   ├── enhance-digest.js      AI 增强（GLM/Kimi）—— execSync 串行调用，每个最多 5min
│   ├── email-config.js        SMTP 配置（读 .env）
│   ├── send-digest.js / daily-digest.js / github-* / publish-pages.js
│   ├── kimi-config.js / config.js / utils.js / logger.js
│   ├── scrapling-deep.py / run-now.sh
│   ├── .env                   ★ 发件用 .env（GLM_API_KEY / KIMI_API_KEY / SMTP_* / MAIL_TO）
│   └── node_modules/
│
├── output/                    600K   累积数据 daily-digest-*.md（4-17 ~ 至今）
├── .sent-flags/               32K    每天一个文件，去重避免重复发件
├── logs/                      8K     历史日志
└── devpulse-scripts.bak-417/  1.1M   段3 过渡备份，可删

/home/ubuntu/                  备份留 7-30 天再删
└── root-devpulse-deploy-backup-20260423.tar.gz   486M  迁移前 root 整盘备份

/root/                         空了（迁移后不再使用）
（不再有 devpulse-deploy）
```

### 进程现状

```
:3000  next dev                  /home/ubuntu/devpulse-deploy/devpulse-saas/   ← 网站
:5556  prisma studio             /home/ubuntu/devpulse-deploy/devpulse-saas/   ← DB 管理
（5555 端口的 prisma studio 已 kill，原本指向已删除的 root 嵌套目录）
```

### 没有定时任务

服务器**没有 cron / systemd timer**，邮件完全靠本地手动跑 `.\devpulse.ps1` 触发。

---

## 本地目录布局

```
E:\project\devpulse-deploy\
├── devpulse.ps1               ★ 触发脚本（已改成 ubuntu 路径）
│                              用法：.\devpulse.ps1                日常一键发件
│                                    .\devpulse.ps1 -SyncProdDb    拉服务器 dev.db 核对
├── README.md                  本文件
│
├── devpulse-scripts\          ←── 服务器 /home/ubuntu/devpulse-deploy/devpulse-scripts/ 镜像
│   ├── server-send.js / send-digest.js / enhance-digest.js
│   ├── github-* / kimi-config.js / email-config.js / utils.js / logger.js
│   ├── scrapling-deep.py / run-now.sh
│   └── .env.example           服务器 .env 字段说明（不入库）
│
├── devpulse-saas\             ←── 服务器 /home/ubuntu/devpulse-deploy/devpulse-saas/ 镜像
│   ├── src\ scripts\ prisma\ ...    Next.js 源码
│   ├── .env / package.json / .gitignore
│   └── _archive\              历史归档（旧 dev.db、调试脚本）
│       ├── dev.db.outer.bak / dev.db.inner.bak
│       ├── check_db.js / check_both_dbs.js / cleanup_*.js / test-*.js
│       └── README-archive.md  每个文件的来历
│
├── output\                    本地采集副本（如果在本地也跑过 collect）
├── _inspect\                  -SyncProdDb 的工作区（gitignore，临时）
│   ├── dev.db.PROD            生产库快照
│   └── users.md               人工核对报告
└── _archive\                  顶层归档（旧版本）

D:\tools\opencli-extension\    ★ 真正的采集器（不在本仓库）
└── scripts\send-digest.js     PS1 调用它跑 --collect 生成数据
```

---

## 三段式路径映射

| 阶段 | 本地 | 服务器 |
|------|------|--------|
| ① 采集 | `D:\tools\opencli-extension\output\daily-digest-<today>*.md` | — |
| ② 上传 | `D:\tools\opencli-extension\output\*<today>*` → `scp` | `/home/ubuntu/devpulse-deploy/output/` |
| ③ 发件 | `ssh root@<server>` 触发 | `cd /home/ubuntu/devpulse-deploy/devpulse-scripts && source /root/.nvm/nvm.sh && node server-send.js --now` |

`devpulse.ps1` 顶部 `$RemoteRoot = "/home/ubuntu/devpulse-deploy"` 决定 ② 和 ③ 都指向同一个 ubuntu 主目录。

> **注意**：ssh 仍用 `root` 登录（因为 node 装在 `/root/.nvm/` 下，ubuntu 用户没 node），但 cwd 切到 `/home/ubuntu/...`，所以 dotenv 会读 ubuntu 那份 `.env`，发件用的还是统一的 ubuntu 路径资源。

---

## 数据库唯一权威源

> **不要再依赖本地 `devpulse-saas/prisma/dev.db`**。
> 真实订阅者只在服务器 `/home/ubuntu/devpulse-deploy/devpulse-saas/prisma/dev.db`。
>
> 想看本地副本时，先跑：
>
> ```powershell
> .\devpulse.ps1 -SyncProdDb
> ```
>
> 它会把生产库 scp 到 `_inspect\dev.db.PROD` 并覆盖 `devpulse-saas\prisma\dev.db`。

### 当前订阅者（2026-04-23）

| email | active | 备注 |
|---|---|---|
| 819966041@qq.com | 1 | 本人 |
| 1422872004@qq.com | 1 | |
| 1263543584@qq.com | 1 | |
| 793789708yyj@gmail.com | 1 | |

历史已删（4-23 清理）：`qiujie@leadong.com` / `666666@qq.com` / `pro@test.com`。

### 直接操作生产库

```bash
# 在服务器（任何 ssh session）
sqlite3 -header -column /home/ubuntu/devpulse-deploy/devpulse-saas/prisma/dev.db \
  "SELECT id, email, active FROM EmailSubscription ORDER BY active DESC, email;"

# 修改前先备份
cp /home/ubuntu/devpulse-deploy/devpulse-saas/prisma/dev.db \
   /home/ubuntu/devpulse-deploy/devpulse-saas/prisma/dev.db.bak-$(date +%Y%m%d-%H%M%S)
```

---

## 历史教训（已踩过的坑，留作警示）

- **2026-04-19 ~ 04-22**：本地存在 `devpulse-saas\prisma\dev.db`（OUTER）与 `devpulse-saas\devpulse-saas\prisma\dev.db`（INNER）两份，内容互不相同，**都不是生产库**。
- 服务器同期也有 `/root/devpulse-deploy/devpulse-saas/devpulse-saas/`（嵌套副本），4-22 还跑着 `prisma studio :5555` 指向它，迷惑性极强。
- `cleanup_qiujie.js` / `cleanup_pro_user.js` 各自在错误的本地库上跑，所以 `qiujie@leadong.com` / `pro@test.com` 至今仍能收到生产邮件 —— 真正清理必须直连服务器 `/home/ubuntu/.../prisma/dev.db`（4-23 已彻底清理）。
- **server-send.js 的 dotenv 没有显式路径**，靠 `process.cwd()` 找 .env。所以 ssh 触发时 `cd` 进哪个目录至关重要 —— 4-17 ~ 4-22 期间因为 cwd 在 `/root/devpulse-deploy/devpulse-scripts/`（无 .env），SMTP_USER 是 undefined，但 nodemailer 没立刻报错，邮件是否真送达存疑。
- **AI 增强串行 + execSync timeout 5 分钟**：`server-send.js` 里 `runEnhance` 调用 `enhance-digest.js`，会调 GLM/Kimi 给热点做语义增强，3 个文件串行最坏 15 分钟。耐心等，不要 Ctrl+C。

---

## 故障还原

如果某天发件失败，按下面顺序排查：

1. **本地 ssh 通不通**：腾讯云镜（`/etc/cron.d/yunjing`）会拦异常 ssh，等 10-30 分钟自动解封，或去腾讯云控制台白名单。
2. **服务器 .env 是否被改过**：`sudo cat /home/ubuntu/devpulse-deploy/devpulse-scripts/.env` 检查 SMTP_USER / SMTP_PASS / MAIL_TO / GLM_API_KEY 是否完整。
3. **数据库订阅者是否被误改**：上面 sqlite3 命令查 `active` 列。
4. **整盘还原**（最后手段）：
   ```bash
   sudo tar xzf /home/ubuntu/root-devpulse-deploy-backup-20260423.tar.gz -C /tmp/
   # 检查 /tmp/devpulse-deploy/ 内容，按需复制回去
   ```

---

## 维护清单

- [ ] **明早**：跑 `.\devpulse.ps1` 验证 4 个订阅者全部收到日报
- [ ] **本周内**：清掉 `/home/ubuntu/devpulse-deploy/devpulse-scripts.bak-417/`
- [ ] **2 周后**：清掉 `~/root-devpulse-deploy-backup-20260423.tar.gz`（486M）
- [ ] **有空时**：把固定 IP 加到腾讯云镜白名单，避免 ssh 老被拦
- [ ] **长期**：考虑把 node 装到 ubuntu 用户下，ssh 时改用 ubuntu 登录，彻底脱离 root 依赖
