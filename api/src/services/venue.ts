import { loadConfig } from '../config/loader.js';

export interface VenueResult {
  name: string;
  address: string;
  phone: string;
  procedures: string[];
}

export function searchVenue(name: string, dataDir = '../../data'): VenueResult | null {
  const config = loadConfig(dataDir);
  const query = name.toLowerCase();

  for (const [_, persona] of config) {
    for (const phase of persona.timeline) {
      for (const proc of phase.procedures) {
        if (proc.where.type === 'fixed') {
          const venueName = proc.where.name.toLowerCase();
          const venueAddr = proc.where.address.toLowerCase();
          if (venueName.includes(query) || venueAddr.includes(query)) {
            return {
              name: proc.where.name,
              address: proc.where.address,
              phone: proc.where.phone,
              procedures: [proc.name],
            };
          }
        }
      }
    }
  }

  return null;
}
