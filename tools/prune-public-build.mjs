import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

// Source-production materials are not runtime assets and must not be published.
const excluded = [
  'assets/ai_generated/raw',
  'assets/ai_generated/selected',
  'assets/source_prompts',
];

await Promise.all(
  excluded.map((path) => rm(resolve('dist', path), { recursive: true, force: true })),
);
