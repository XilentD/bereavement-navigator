import { FastifyInstance } from 'fastify';
import type { PersonaConfig } from '../config/loader.js';

export async function personasRoutes(app: FastifyInstance, config: Map<string, PersonaConfig>) {
  app.get<{ Querystring: { city?: string } }>('/api/personas', async (request) => {
    const { city } = request.query;
    let personas = [...config.values()];
    if (city) {
      personas = personas.filter(p => p.persona.city === city);
    }
    const cities = [...new Set([...config.values()].map(p => p.persona.city))];
    return {
      cities,
      personas: personas.map(p => ({
        id: p.persona.id,
        city: p.persona.city,
        name: p.persona.name,
        description: p.persona.description,
      })),
    };
  });
}
