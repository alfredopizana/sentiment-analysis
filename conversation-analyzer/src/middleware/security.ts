import rateLimit from 'express-rate-limit';
import { config } from '../config/config';

// Rate limiting
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health'
});

// Webhook-specific rate limiter (more permissive)
export const webhookRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 1000, // Allow more requests for webhooks
  message: {
    success: false,
    error: 'Webhook rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// API key validation middleware
export const validateApiKey = (req: any, res: any, next: any) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required'
    });
  }

  // TODO: Implement proper API key validation
  // This would check against a database or configuration
  const validApiKeys = [
    config.caseRecordApi.apiKey,
    'dev-api-key-123' // Development key
  ].filter(Boolean);

  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  next();
};

// Request validation middleware
export const validateRequest = (req: any, res: any, next: any) => {
  // Add request ID if not present
  if (!req.id) {
    req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Validate content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        error: 'Content-Type must be application/json'
      });
    }
  }

  next();
};

// CORS configuration for webhooks
export const webhookCorsOptions = {
  origin: (origin: any, callback: any) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow Twilio and Genesys domains
    const allowedOrigins = [
      /\.twilio\.com$/,
      /\.genesys\.com$/,
      /\.mypurecloud\.com$/,
      config.server.corsOrigin
    ];
    
    const isAllowed = allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') {
        return origin === pattern;
      }
      return pattern.test(origin);
    });
    
    callback(null, isAllowed);
  },
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type', 'X-Twilio-Signature', 'X-Genesys-Signature'],
  credentials: false
};
