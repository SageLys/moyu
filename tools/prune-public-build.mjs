import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

// These are source-production materials, not runtime game assets.  Keep them
// out of the public deployment even though Vite copies public/ verbatim.
const excluded = [
  'assets/ai_generated/raw',
  'assets/ai_generated/selected',
  'assets/source_prompts',
  'assets/ai_generated/processed/mood_reference_office_pressure.png',
  'assets/ai_generated/processed/poster_style_reference_01.png',
  'assets/ai_generated/processed/poster_style_reference_02.png',
];

await Promise.all(
  excluded.map((path) => rm(resolve('dist', path), { recursive: true, force: true })),
);
