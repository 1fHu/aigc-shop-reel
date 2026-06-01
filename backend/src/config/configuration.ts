export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL || 'postgresql://vidcraft:vidcraft@localhost:5432/vidcraft',
  },
  redis: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
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
