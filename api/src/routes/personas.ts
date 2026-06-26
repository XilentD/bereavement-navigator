import { FastifyInstance } from 'fastify';
import type { PersonaConfig } from '../config/loader.js';

export async function personasRoutes(app: FastifyInstance, config: Map<string, PersonaConfig>) {
  app.get('/api/personas', async () => {
    const personas = [...config.values()].map(p => ({
      id: p.persona.id,
      name: p.persona.name,
      description: p.persona.description,
    }));
    return { personas };
  });
}
