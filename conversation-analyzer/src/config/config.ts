import dotenv from 'dotenv';
import { PlatformType } from '../types';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '6000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000'
  },

  websocket: {
    port: parseInt(process.env.WS_PORT || '6001', 10)
  },

  caseRecordApi: {
    url: process.env.CASE_RECORD_API_URL || 'http://localhost:5000/api',
    apiKey: process.env.CASE_RECORD_API_KEY || ''
  },

  sentimentApi: {
    url: process.env.SENTIMENT_API_URL || 'http://localhost:8000',
    apiKey: process.env.SENTIMENT_API_KEY || ''
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    webhookUrl: process.env.TWILIO_WEBHOOK_URL || ''
  },

  genesys: {
    clientId: process.env.GENESYS_CLIENT_ID || '',
    clientSecret: process.env.GENESYS_CLIENT_SECRET || '',
    environment: process.env.GENESYS_ENVIRONMENT || 'mypurecloud.com',
    webhookUrl: process.env.GENESYS_WEBHOOK_URL || ''
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/conversation-analyzer.log'
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10)
  },

  analysis: {
    batchSize: parseInt(process.env.ANALYSIS_BATCH_SIZE || '10', 10),
    intervalMs: parseInt(process.env.ANALYSIS_INTERVAL_MS || '5000', 10),
    maxConversationDuration: parseInt(process.env.MAX_CONVERSATION_DURATION_MS || '3600000', 10),
    sentimentThreshold: parseFloat(process.env.CRISIS_SENTIMENT_THRESHOLD || '-0.7'),
    crisisKeywordsThreshold: parseInt(process.env.CRISIS_KEYWORDS_THRESHOLD || '3', 10),
    autoCaseCreation: process.env.AUTO_CASE_CREATION_ENABLED === 'true',
    realTimeAnalysis: true
  },

  adapters: {
    [PlatformType.TWILIO]: {
      enabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      config: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        webhookUrl: process.env.TWILIO_WEBHOOK_URL
      }
    },
    [PlatformType.GENESYS]: {
      enabled: !!(process.env.GENESYS_CLIENT_ID && process.env.GENESYS_CLIENT_SECRET),
      config: {
        clientId: process.env.GENESYS_CLIENT_ID,
        clientSecret: process.env.GENESYS_CLIENT_SECRET,
        environment: process.env.GENESYS_ENVIRONMENT,
        webhookUrl: process.env.GENESYS_WEBHOOK_URL
      }
    },
    [PlatformType.WEBSOCKET]: {
      enabled: true,
      config: {
        port: parseInt(process.env.WS_PORT || '6001', 10)
      }
    }
  }
};

// Validate required configuration
export const validateConfig = () => {
  const errors: string[] = [];

  if (config.server.nodeEnv === 'production') {
    if (!config.caseRecordApi.url) {
      errors.push('CASE_RECORD_API_URL is required in production');
    }

    if (!config.redis.url) {
      errors.push('REDIS_URL is required in production');
    }
  }

  // Check if at least one adapter is enabled
  const enabledAdapters = Object.values(config.adapters).filter(adapter => adapter.enabled);
  if (enabledAdapters.length === 0) {
    errors.push('At least one platform adapter must be enabled');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
};

export default config;
