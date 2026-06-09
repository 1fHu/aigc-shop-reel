function requireEnv(key: string, devFallback?: string): string {
  const value = process.env[key];
  if (value) return value;
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !devFallback) {
    throw new Error(`Missing required environment variable: ${key}. This must be set in production.`);
  }
  if (devFallback !== undefined) return devFallback;
  if (!isProduction) {
    console.warn(`[config] ${key} not set — using empty value (dev only)`);
  }
  return '';
}

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: requireEnv('DATABASE_URL', 'postgresql://vidcraft:vidcraft@localhost:5432/vidcraft'),
  },
  redis: { url: process.env.REDIS_URL || (process.env.REDIS_PASSWORD ? `redis://:${process.env.REDIS_PASSWORD}@localhost:6379` : 'redis://localhost:6379') },
  jwt: {
    secret: process.env.JWT_SECRET || 'vidcraft-dev-jwt-secret-do-not-use-in-prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'vidcraft-dev-refresh-secret-do-not-use-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  volcano: {
    accessKey: process.env.VOLCANO_ACCESS_KEY || '',
    secretKey: process.env.VOLCANO_SECRET_KEY || '',
    region: process.env.VOLCANO_REGION || 'cn-north-1',
    tts: {
      appId: process.env.VOLCANO_TTS_APP_ID || '',
      accessKey: process.env.VOLCANO_TTS_ACCESS_KEY || '',
      resourceId: process.env.VOLCANO_TTS_RESOURCE_ID || 'seed-tts-2.0',
      voiceId: process.env.TTS_VOICE_ID || 'zh_female_qingxin',
    },
  },
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'vidcraft-media',
  },
  seedance: {
    callbackSecret: process.env.SEEDANCE_CALLBACK_SECRET || '',
    callbackBaseUrl: process.env.SEEDANCE_CALLBACK_BASE_URL || 'http://localhost:3000',
  },
});
