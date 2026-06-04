/**
 * AI API 配置 — GLM-4.7 主模型 + Kimi 备选
 *
 * providers[0] 为首选项，失败时自动降级到 providers[1]
 * 所有 provider 使用 OpenAI 兼容格式
 *
 * GLM-4.7 是推理模型，会消耗 token 做思考(reasoning_content)，
 * 因此 max_tokens 和 timeout 需要比普通模型大得多
 */

require('dotenv').config();
const https = require('https');
const http = require('http');

const providers = [
  {
    name: 'GLM-4.5-Air',
    apiKey: process.env.GLM_API_KEY,
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4.5-air',
    defaultMaxTokens: 8192,
    timeout: 90000,
  },
  {
    name: 'GLM-5.1',
    apiKey: process.env.GLM_API_KEY,
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-5.1',
    defaultMaxTokens: 8192,
    timeout: 90000,
  },
  {
    name: 'Kimi',
    apiKey: process.env.KIMI_API_KEY,
    baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-8k',
    defaultMaxTokens: 4096,
    timeout: 60000,
  },
];

/**
 * 调用 AI API，自动在 providers 间降级
 * @param {string} system - system prompt
 * @param {string} user - user prompt
 * @param {{ jsonMode?: boolean, temperature?: number, maxTokens?: number }} [opts]
 * @returns {Promise<string>} AI 回复文本
 */
function chat(system, user, opts = {}) {
  const { jsonMode = true, temperature = 0.3 } = opts;

  function tryProvider(idx) {
    const prov = providers[idx];
    if (!prov) {
      const tried = providers.map(p => p.name).join(' → ');
      return Promise.reject(new Error(`所有 AI 提供商均失败: ${tried}`));
    }

    // 优先使用调用方指定的 maxTokens，否则用 provider 默认值
    const maxTokens = opts.maxTokens || prov.defaultMaxTokens;

    const body = JSON.stringify({
      model: prov.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    });

    return new Promise((resolve, reject) => {
      let settled = false; // 防止 timeout + error 双重触发 fallback

      const url = new URL(prov.baseUrl);
      const transport = url.protocol === 'https:' ? https : http;

      const doFallback = (reason) => {
        if (settled) return;
        settled = true;
        console.warn(`[AI] ${prov.name} ${reason}, 降级到下一提供商`);
        tryProvider(idx + 1).then(resolve, reject);
      };

      const req = transport.request({
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${prov.apiKey}`,
        },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (settled) return;
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.message?.content;
            if (content) {
              settled = true;
              resolve(content);
            } else {
              // GLM-4.7 推理模型：content 为空但 reasoning_content 有值 = token 不够
              const reason = json.choices?.[0]?.finish_reason;
              const errMsg = json.error?.message
                || (reason === 'length' ? `输出被截断(finish_reason=length), max_tokens=${maxTokens} 可能不够`
                  : data.slice(0, 200));
              doFallback(errMsg);
            }
          } catch (e) {
            doFallback(`响应解析失败: ${e.message}`);
          }
        });
      });

      req.on('error', (e) => doFallback(`请求失败: ${e.message}`));

      req.setTimeout(prov.timeout, () => {
        req.destroy();
        doFallback(`超时(${prov.timeout / 1000}s)`);
      });

      req.write(body);
      req.end();
    });
  }

  return tryProvider(0);
}

module.exports = {
  /** 向后兼容：主 provider 的配置 */
  get apiKey() { return providers[0].apiKey; },
  get baseUrl() { return providers[0].baseUrl; },
  get model() { return providers[0].model; },
  providers,
  chat,
};
