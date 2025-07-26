import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';

import { config, validateConfig } from './config/config';
import { logger, createLogger } from './utils/logger';
import { ConversationProcessor } from './processors/ConversationProcessor';
import { TwilioAdapter } from './adapters/TwilioAdapter';
import { GenesysAdapter } from './adapters/GenesysAdapter';
import { WebSocketAdapter } from './adapters/WebSocketAdapter';
import { BaseAdapter } from './adapters/BaseAdapter';
import { PlatformType, WebhookPayload, ConversationSession } from './types';
import webhookRoutes from './routes/webhooks';
import apiRoutes from './routes/api';
import { rateLimiter } from './middleware/security';

class ConversationAnalyzerApp {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private processor: ConversationProcessor;
  private adapters = new Map<PlatformType, BaseAdapter>();
  private appLogger = createLogger('ConversationAnalyzerApp');

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.server.corsOrigin,
        methods: ['GET', 'POST']
      }
    });
    this.processor = new ConversationProcessor();
  }

  async initialize(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Initialize adapters
      await this.initializeAdapters();

      // Setup event handlers
      this.setupEventHandlers();

      // Setup Socket.IO
      this.setupSocketIO();

      this.appLogger.info('Conversation Analyzer initialized successfully');
    } catch (error) {
      this.appLogger.error('Failed to initialize application', { error });
      throw error;
    }
  }

  async start(): Promise<void> {
    try {
      // Start all adapters
      await this.startAdapters();

      // Start server
      this.server.listen(config.server.port, () => {
        this.appLogger.info(`Server running on port ${config.server.port}`);
        this.logSystemStatus();
      });

      // Graceful shutdown handlers
      this.setupGracefulShutdown();

    } catch (error) {
      this.appLogger.error('Failed to start application', { error });
      throw error;
    }
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(rateLimiter);
    this.app.use(cors({
      origin: config.server.corsOrigin,
      credentials: true
    }));

    // General middleware
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (config.server.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-ID', req.id);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', async (req, res) => {
      const health = await this.getHealthStatus();
      res.status(health.healthy ? 200 : 503).json(health);
    });

    // API routes
    this.app.use('/api', apiRoutes);

    // Webhook routes
    this.app.use('/webhooks', webhookRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Conversation Analyzer',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          api: '/api',
          webhooks: '/webhooks',
          websocket: `ws://localhost:${config.websocket.port}`
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
      });
    });

    // Error handler
    this.app.use((error: any, req: any, res: any, next: any) => {
      this.appLogger.error('Express error', {
        requestId: req.id,
        error: error.message,
        stack: error.stack
      });

      res.status(error.status || 500).json({
        error: 'Internal Server Error',
        message: config.server.nodeEnv === 'development' ? error.message : 'Something went wrong',
        requestId: req.id
      });
    });
  }

  private async initializeAdapters(): Promise<void> {
    const enabledAdapters = Object.entries(config.adapters)
      .filter(([_, adapterConfig]) => adapterConfig.enabled);

    for (const [platformType, adapterConfig] of enabledAdapters) {
      try {
        let adapter: BaseAdapter;

        switch (platformType as PlatformType) {
          case PlatformType.TWILIO:
            adapter = new TwilioAdapter(adapterConfig.config);
            break;
          case PlatformType.GENESYS:
            adapter = new GenesysAdapter(adapterConfig.config);
            break;
          case PlatformType.WEBSOCKET:
            adapter = new WebSocketAdapter(adapterConfig.config);
            break;
          default:
            this.appLogger.warn('Unknown platform type', { platformType });
            continue;
        }

        await adapter.initialize();
        this.adapters.set(platformType as PlatformType, adapter);
        
        this.appLogger.info('Adapter initialized', { platformType });
      } catch (error) {
        this.appLogger.error('Failed to initialize adapter', { 
          platformType, 
          error: (error as Error).message 
        });
      }
    }
  }

  private async startAdapters(): Promise<void> {
    for (const [platformType, adapter] of this.adapters) {
      try {
        await adapter.startListening();
        this.appLogger.info('Adapter started', { platformType });
      } catch (error) {
        this.appLogger.error('Failed to start adapter', { 
          platformType, 
          error: (error as Error).message 
        });
      }
    }
  }

  private setupEventHandlers(): void {
    // Setup adapter event handlers
    this.adapters.forEach((adapter, platformType) => {
      adapter.on('session:created', (session: ConversationSession) => {
        this.appLogger.info('New conversation session', { 
          sessionId: session.id, 
          platform: platformType 
        });
        this.io.emit('session:created', session);
      });

      adapter.on('message:received', async (message, session) => {
        this.appLogger.debug('Message received', { 
          sessionId: session.id, 
          messageId: message.id,
          platform: platformType 
        });
        
        // Process message in real-time
        await this.processor.processMessage(session, message);
        
        // Emit to connected clients
        this.io.to(`session:${session.id}`).emit('message:received', message);
      });

      adapter.on('session:ended', async (session: ConversationSession) => {
        this.appLogger.info('Conversation session ended', { 
          sessionId: session.id, 
          platform: platformType 
        });
        
        // Final processing
        const result = await this.processor.processSessionEnd(session);
        
        // Emit to connected clients
        this.io.to(`session:${session.id}`).emit('session:ended', session, result);
      });

      adapter.on('error', (error, context) => {
        this.appLogger.error('Adapter error', { 
          platform: platformType, 
          error: error.message, 
          context 
        });
      });
    });

    // Setup processor event handlers
    this.processor.on('processing:completed', (result, session) => {
      this.appLogger.info('Processing completed', { 
        sessionId: session.id,
        riskLevel: result.analysis.riskLevel,
        actionsExecuted: result.actions.filter(a => a.executed).length
      });
      
      this.io.to(`session:${session.id}`).emit('analysis:updated', result.analysis);
      
      if (result.caseCreated || result.caseUpdated) {
        this.io.emit('case:updated', {
          sessionId: session.id,
          caseId: session.caseId,
          created: result.caseCreated,
          updated: result.caseUpdated
        });
      }
    });

    this.processor.on('supervisor:alert', (alert) => {
      this.appLogger.warn('Supervisor alert', alert);
      this.io.emit('supervisor:alert', alert);
    });

    this.processor.on('call:escalate', (escalation) => {
      this.appLogger.warn('Call escalation', escalation);
      this.io.emit('call:escalate', escalation);
    });
  }

  private setupSocketIO(): void {
    this.io.on('connection', (socket) => {
      this.appLogger.info('Client connected', { socketId: socket.id });

      socket.on('join:session', (sessionId: string) => {
        socket.join(`session:${sessionId}`);
        this.appLogger.debug('Client joined session', { socketId: socket.id, sessionId });
      });

      socket.on('leave:session', (sessionId: string) => {
        socket.leave(`session:${sessionId}`);
        this.appLogger.debug('Client left session', { socketId: socket.id, sessionId });
      });

      socket.on('disconnect', () => {
        this.appLogger.info('Client disconnected', { socketId: socket.id });
      });
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.appLogger.info(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        this.server.close();
        
        // Stop all adapters
        for (const [platformType, adapter] of this.adapters) {
          try {
            await adapter.cleanup();
            this.appLogger.info('Adapter cleaned up', { platformType });
          } catch (error) {
            this.appLogger.error('Error cleaning up adapter', { 
              platformType, 
              error: (error as Error).message 
            });
          }
        }
        
        // Cleanup processor
        this.processor.cleanup();
        
        this.appLogger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        this.appLogger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  private async getHealthStatus(): Promise<any> {
    const adapterHealth = new Map();
    
    for (const [platformType, adapter] of this.adapters) {
      adapterHealth.set(platformType, await adapter.healthCheck());
    }

    const processingStatus = this.processor.getProcessingStatus();
    
    const allAdaptersHealthy = Array.from(adapterHealth.values())
      .every(health => health.healthy);

    return {
      healthy: allAdaptersHealthy,
      timestamp: new Date().toISOString(),
      service: 'conversation-analyzer',
      version: '1.0.0',
      adapters: Object.fromEntries(adapterHealth),
      processing: processingStatus,
      uptime: process.uptime()
    };
  }

  private logSystemStatus(): void {
    const enabledAdapters = Array.from(this.adapters.keys());
    
    this.appLogger.info(`
🚀 Conversation Analyzer is running!
📍 Environment: ${config.server.nodeEnv}
🌐 HTTP Server: http://localhost:${config.server.port}
🔌 WebSocket: ws://localhost:${config.websocket.port}
📡 Enabled Adapters: ${enabledAdapters.join(', ')}
🔄 Auto Case Creation: ${config.analysis.autoCaseCreation ? 'Enabled' : 'Disabled'}
📊 Analysis Interval: ${config.analysis.intervalMs}ms
    `);
  }

  // Public methods for external access
  getAdapter(platformType: PlatformType): BaseAdapter | undefined {
    return this.adapters.get(platformType);
  }

  getProcessor(): ConversationProcessor {
    return this.processor;
  }

  async processWebhook(platformType: PlatformType, payload: WebhookPayload): Promise<void> {
    const adapter = this.adapters.get(platformType);
    if (adapter) {
      await adapter.processWebhook(payload);
    } else {
      throw new Error(`No adapter found for platform: ${platformType}`);
    }
  }
}

// Create and start the application
const app = new ConversationAnalyzerApp();

app.initialize()
  .then(() => app.start())
  .catch((error) => {
    logger.error('Failed to start application', { error });
    process.exit(1);
  });

export default app;
