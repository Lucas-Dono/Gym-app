/** @type {import('next').NextConfig} */
const nextConfig = {
  // La caché de fichas de ejercicios se guarda en data/cache (ver lib/cache.ts).
  outputFileTracingIncludes: { "/api/**": ["./data/exercises.raw.json"] },
};
export default nextConfig;
