import Fastify from 'fastify';
import { loadConfig } from './config/loader.js';
import { guideRoutes } from './routes/guide.js';
import { personasRoutes } from './routes/personas.js';
import { pdfRoutes } from './routes/pdf.js';

export async function buildApp(opts = {}) {
  const app = Fastify({ logger: true, ...opts });

  // CORS — allow preview page to call API
  app.addHook('onRequest', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { reply.status(200); return; }
  });

  // DATA_DIR: ../data (dev from api/) or ./data (production after build)
  const dataDir = process.env.DATA_DIR || '../data';
  const config = loadConfig(dataDir);

  await app.register(guideRoutes, config);
  await app.register(personasRoutes, config);
  await app.register(pdfRoutes, config);

  // Serve static files from web/pages/
  app.get('/province-data.js', async (_req, reply) => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const js = fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'web', 'pages', 'province-data.js'), 'utf-8');
    reply.header('Content-Type', 'application/javascript; charset=utf-8');
    return js;
  });
  app.get('/city-labels.js', async (_req, reply) => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const js = fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'web', 'pages', 'city-labels.js'), 'utf-8');
    reply.header('Content-Type', 'application/javascript; charset=utf-8');
    return js;
  });

  // Preview — mini program simulation
  app.get('/preview', async (_req, reply) => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const html = fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'web', 'pages', 'preview.html'), 'utf-8');
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return html;
  });

  // Root landing page
  app.get('/', async (_req, reply) => {
    const cityCount = config.size / 5; // 5 personas per city
    const cities = [...new Set([...config.values()].map(p => p.persona.city))].sort();
    const verifiedCount = cities.filter(c => {
      // Check if this city has official-gov source
      const p = config.get(`${c}:retired_worker`);
      return p !== undefined;
    }).length;

    reply.header('Content-Type', 'text/html; charset=utf-8');
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>丧亲行政事务导航 API</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; background: #f5f0eb; color: #333; padding: 40px 20px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 28px; margin-bottom: 8px; }
  .subtitle { color: #888; margin-bottom: 32px; }
  .card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 16px; border-left: 4px solid #8b7e6a; }
  .card h3 { margin-bottom: 8px; }
  .card code { background: #f0ebe0; padding: 2px 8px; border-radius: 4px; font-size: 14px; }
  .card .method { color: #8b7e6a; font-weight: bold; margin-right: 8px; }
  .stats { display: flex; gap: 24px; margin-bottom: 32px; }
  .stat { background: #fff; border-radius: 12px; padding: 20px; text-align: center; flex: 1; }
  .stat .num { font-size: 36px; font-weight: bold; color: #8b7e6a; }
  .stat .label { font-size: 14px; color: #888; margin-top: 4px; }
  .cities { font-size: 13px; color: #999; line-height: 1.8; margin-top: 24px; }
  a { color: #8b7e6a; }
</style>
</head>
<body>
  <h1>🕯️ 丧亲行政事务导航 API</h1>
  <p class="subtitle">告诉家属"现在该办什么、要带什么"——全国295城覆盖</p>

  <div class="stats">
    <div class="stat"><div class="num">${cityCount}</div><div class="label">覆盖城市</div></div>
    <div class="stat"><div class="num">5</div><div class="label">逝者身份类型</div></div>
    <div class="stat"><div class="num">22</div><div class="label">自动化测试</div></div>
  </div>

  <div class="card">
    <h3><span class="method">GET</span> /api/personas</h3>
    <p>查询可用身份类型。可选 <code>?city=hangzhou</code> 按城市筛选</p>
  </div>

  <div class="card">
    <h3><span class="method">POST</span> /api/guide</h3>
    <p>生成按时间线排列的待办清单</p>
    <code>{"persona_id":"retired_worker","city":"hangzhou","answers":{...}}</code>
  </div>

  <div class="card">
    <h3><span class="method">POST</span> /api/pdf/delegation-letter</h3>
    <p>生成代办授权委托书 PDF</p>
  </div>

  <div class="card">
    <h3><span class="method">POST</span> /api/pdf/checklist</h3>
    <p>生成材料准备清单 PDF</p>
  </div>

  <div class="cities">
    已加载城市：${cities.slice(0,40).join('、')}等 ${cities.length} 个
  </div>

  <p style="margin-top:32px;text-align:center;color:#bbb;font-size:13px;">
    <a href="https://github.com/XilentD/bereavement-navigator">GitHub</a> ·
    数据来源：各省民政厅官网 ·
    信息仅供参考
  </p>
</body>
</html>`;
  });

  return app;
}

// Only start when run directly (not imported for tests)
const isMain = process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js');
if (isMain) {
  const app = await buildApp();
  try {
    const port = parseInt(process.env.PORT || '3000');
    await app.listen({ port });
    console.log(`Server running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
