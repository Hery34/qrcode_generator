export function createSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function sanitizeFileName(value: string) {
  return createSlug(value) || 'carte-qr';
}

export function buildPublicCardUrl(slug: string) {
  if (typeof window === 'undefined') {
    return `/carte/${slug}`;
  }

  return `${window.location.origin}/carte/${slug}`;
}
