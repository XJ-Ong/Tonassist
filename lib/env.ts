const required = [
  'ADMIN_PASSWORD', 'SESSION_SECRET', 'GEMINI_API_KEY',
  'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
] as const;
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}
