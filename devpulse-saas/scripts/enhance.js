/**
 * 增强脚本 — 独立运行 AI 增强流水线
 * 用法: node scripts/enhance.js [--date 2026-04-16]
 * 
 * 读取原始采集数据 → 调用 AI API → 输出 enhanced 文件
 * 可独立于 collect.js 运行，适合单独重跑 AI 处理
 */

const { execSync } = require("child_process");
const path = require("path");

const SCRIPTS_DIR = process.env.SCRIPTS_DIR || "D:\\tools\\opencli-extension\\scripts";

const args = process.argv.slice(2);
const dateIdx = args.indexOf("--date");
const today = dateIdx !== -1 ? args[dateIdx + 1] : new Date().toISOString().slice(0, 10);

console.log(`\n[Enhance] ${today} — AI 增强流水线\n`);

const steps = [
  {
    cmd: `node enhance-digest.js`,
    label: "热点日报 AI 增强",
    timeout: 300000,
  },
  {
    cmd: `node github-analysis.js`,
    label: "GitHub 深度分析",
    timeout: 300000,
  },
];

for (const step of steps) {
  console.log(`  ${step.label} ...`);
  const start = Date.now();
  try {
    execSync(step.cmd, {
      cwd: SCRIPTS_DIR,
      stdio: "pipe",
      timeout: step.timeout,
      env: {
        ...process.env,
        HTTP_PROXY: process.env.HTTP_PROXY || "http://127.0.0.1:7897",
        HTTPS_PROXY: process.env.HTTPS_PROXY || "http://127.0.0.1:7897",
      },
    });
    console.log(`    ✓ 完成 (${Date.now() - start}ms)`);
  } catch (e) {
    console.log(`    ✗ 失败: ${e.message?.slice(0, 100)}`);
  }
}

console.log(`\n[Enhance] 完成\n`);
