function normalized(value: string) {
  const candidate = value.trim().replace(/\/$/, '');
  if (!candidate) return '';
  return candidate.startsWith('http://') || candidate.startsWith('https://') ? candidate : `https://${candidate}`;
}

export function getSiteUrl() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    '';

  return normalized(siteUrl) || 'http://localhost:3000';
}
