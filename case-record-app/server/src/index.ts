import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/config';
import { connectDatabase } from './config/database';
import { swaggerSpec } from './config/swagger';
import { rateLimiter, helmetConfig, corsOptions } from './middleware/security';
import { errorHandler, notFound } from './middleware/errorHandler';
import routes from './routes';

const app = express();

// Trust proxy for rate limiting and security (when behind reverse proxy)
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// Connect to database
connectDatabase();

// Security middleware
app.use(helmetConfig);
app.use(rateLimiter);
app.use(cors(corsOptions));

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Case Record API Documentation'
}));

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Case Record Management API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      cases: '/api/cases',
      crisisTypes: '/api/crisis-types',
      health: '/api/health'
    }
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`
🚀 Case Record API Server is running!
📍 Environment: ${config.nodeEnv}
🌐 Server: http://localhost:${PORT}
📚 API Docs: http://localhost:${PORT}/api-docs
🗄️  Database: ${config.mongoUri}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;
