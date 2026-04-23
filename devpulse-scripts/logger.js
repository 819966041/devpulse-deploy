/**
 * 日志系统 — 文件日志 + 运行指标
 */

const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', 'logs');
fs.mkdirSync(logDir, { recursive: true });

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function log(level, msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${msg}\n`;
  const logFile = path.join(logDir, `${getToday()}.log`);
  fs.appendFileSync(logFile, line, 'utf-8');
  console.log(line.trimEnd());
}

const logger = {
  info(msg) { log('INFO', msg); },
  warn(msg) { log('WARN', msg); },
  error(msg, err) { log('ERROR', `${msg}: ${err?.message || err || ''}`); },
};

/**
 * 运行指标记录器
 */
class Metrics {
  constructor() {
    this.data = {
      date: getToday(),
      timestamp: new Date().toISOString(),
      collection: { total_items: 0, sources_success: [], sources_failed: [], duration_ms: 0 },
      ai: { items_processed: 0, api_calls: 0, duration_ms: 0 },
      delivery: {},
    };
  }

  collectionStart() { this._collectionStart = Date.now(); }
  collectionEnd() { this.data.collection.duration_ms = Date.now() - (this._collectionStart || 0); }
  aiStart() { this._aiStart = Date.now(); }
  aiEnd() { this.data.ai.duration_ms = Date.now() - (this._aiStart || 0); }

  addSourceSuccess(source) {
    this.data.collection.sources_success.push(source);
  }

  addSourceFailed(source, error) {
    this.data.collection.sources_failed.push({ source, error: String(error) });
  }

  setItemCount(n) { this.data.collection.total_items = n; }
  setAiProcessed(n) { this.data.ai.items_processed = n; }
  addApiCall() { this.data.ai.api_calls++; }

  setDelivery(channel, success, durationMs) {
    this.data.delivery[channel] = { success, duration_ms: durationMs || 0 };
  }

  save() {
    const metricsDir = path.join(__dirname, '..', 'output');
    fs.mkdirSync(metricsDir, { recursive: true });
    const filePath = path.join(metricsDir, `metrics-${getToday()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    logger.info(`指标已保存: ${filePath}`);
  }

  getSuccessSources() {
    return this.data.collection.sources_success;
  }

  getFailedCount() {
    return this.data.collection.sources_failed.length;
  }
}

module.exports = { logger, Metrics };
