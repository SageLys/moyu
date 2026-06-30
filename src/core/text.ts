import { copyText } from './config';

export function resolveCopyText(path: string): string | string[] | undefined {
  const parts = path.split('.');
  let cur: unknown = copyText;
  for (const part of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) {
      const idx = parseInt(part, 10);
      if (isNaN(idx)) return undefined;
      cur = (cur as unknown[])[idx];
    } else if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  if (typeof cur === 'string') return cur;
  if (Array.isArray(cur)) return cur as string[];
  return undefined;
}

export function pickFeedback(keys: string[]): string {
  for (const key of keys) {
    const val = resolveCopyText(key);
    if (typeof val === 'string') return val;
    if (Array.isArray(val) && val.length > 0) return val[0];
  }
  return '';
}
