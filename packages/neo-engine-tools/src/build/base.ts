export const DEFAULT_H5_BASE = './';

export function normalizeH5Base(base?: string): string {
  if (base === undefined) {
    return DEFAULT_H5_BASE;
  }

  const value = base.trim();
  if (value === '') {
    throw new Error('H5 base path must be a non-empty string');
  }

  if (value === '.') {
    return './';
  }

  return value.endsWith('/') ? value : `${value}/`;
}
