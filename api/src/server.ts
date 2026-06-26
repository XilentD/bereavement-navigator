import Fastify from 'fastify';
import { loadConfig } from './config/loader.js';
import { guideRoutes } from './routes/guide.js';
import { personasRoutes } from './routes/personas.js';
import { pdfRoutes } from './routes/pdf.js';

export async function buildApp(opts = {}) {
  const app = Fastify({ logger: true, ...opts });

  const dataDir = process.env.DATA_DIR || '../data';
  const config = loadConfig(dataDir);

  await app.register(guideRoutes, config);
  await app.register(personasRoutes, config);
  await app.register(pdfRoutes, config);

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
