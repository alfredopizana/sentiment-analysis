import { WebSocketServer, WebSocket } from 'ws';
import { BaseAdapter } from './BaseAdapter';
import { 
  PlatformType, 
  ConversationMessage, 
  WebhookPayload, 
  ConversationStatus 
} from '../types';

interface WebSocketClient {
  id: string;
  ws: WebSocket;
  sessionId?: string;
  metadata: Record<string, any>;
}

export class WebSocketAdapter extends BaseAdapter {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, WebSocketClient>();

  constructor(config: Record<string, any>) {
    super(PlatformType.WEBSOCKET, config);
  }

  async initialize(): Promise<void> {
    try {
      this.wss = new WebSocketServer({ 
        port: this.config.port,
        perMessageDeflate: false
      });

      this.setupWebSocketServer();
      
      this.isInitialized = true;
      this.logger.info('WebSocket adapter initialized successfully', { port: this.config.port });
    } catch (error) {
      this.logger.error('Failed to initialize WebSocket adapter', { error });
      throw error;
    }
  }

  async startListening(): Promise<void> {
    if (!this.isInitialized || !this.wss) {
      throw new Error('Adapter must be initialized before starting to listen');
    }

    this.isListening = true;
    this.logger.info('WebSocket adapter started listening', { port: this.config.port });
  }

  async stopListening(): Promise<void> {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    
    this.clients.clear();
    this.isListening = false;
    this.logger.info('WebSocket adapter stopped listening');
  }

  async sendMessage(conversationId: string, message: string): Promise<void> {
    const session = this.getSession(conversationId);
    if (!session) {
      throw new Error(`Session not found: ${conversationId}`);
    }

    // Find clients associated with this session
    const sessionClients = Array.from(this.clients.values())
      .filter(client => client.sessionId === conversationId);

    const messagePayload = {
      type: 'agent_message',
      conversationId,
      message,
      timestamp: new Date().toISOString()
    };

    sessionClients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(messagePayload));
      }
    });

    // Add the message to the session
    this.addMessage(conversationId, {
      timestamp: new Date(),
      speaker: 'agent',
      content: message,
      metadata: {
        source: 'websocket_agent'
      }
    });

    this.logger.info('Message sent via WebSocket', { conversationId, clientCount: sessionClients.length });
  }

  async getConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
    const session = this.getSession(conversationId);
    return session ? session.messages : [];
  }

  async processWebhook(payload: WebhookPayload): Promise<void> {
    // WebSocket adapter doesn't use traditional webhooks
    this.logger.debug('WebSocket adapter received webhook payload', { event: payload.event });
  }

  private setupWebSocketServer(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      const client: WebSocketClient = {
        id: clientId,
        ws,
        metadata: {
          userAgent: request.headers['user-agent'],
          origin: request.headers.origin,
          connectedAt: new Date()
        }
      };

      this.clients.set(clientId, client);
      this.logger.info('WebSocket client connected', { clientId, clientCount: this.clients.size });

      // Send welcome message
      this.sendToClient(client, {
        type: 'connected',
        clientId,
        message: 'Connected to conversation analyzer'
      });

      ws.on('message', (data: Buffer) => {
        this.handleClientMessage(client, data);
      });

      ws.on('close', (code: number, reason: Buffer) => {
        this.handleClientDisconnect(client, code, reason.toString());
      });

      ws.on('error', (error: Error) => {
        this.logger.error('WebSocket client error', { clientId, error: error.message });
      });

      ws.on('pong', () => {
        client.metadata.lastPong = new Date();
      });
    });

    this.wss.on('error', (error: Error) => {
      this.logger.error('WebSocket server error', { error: error.message });
      this.handleError(error);
    });

    // Setup ping interval to keep connections alive
    setInterval(() => {
      this.pingClients();
    }, 30000); // Ping every 30 seconds
  }

  private handleClientMessage(client: WebSocketClient, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'start_conversation':
          this.handleStartConversation(client, message);
          break;
        
        case 'send_message':
          this.handleSendMessage(client, message);
          break;
        
        case 'end_conversation':
          this.handleEndConversation(client, message);
          break;
        
        case 'join_conversation':
          this.handleJoinConversation(client, message);
          break;
        
        default:
          this.logger.debug('Unknown message type from WebSocket client', { 
            clientId: client.id, 
            type: message.type 
          });
      }
    } catch (error) {
      this.logger.error('Error parsing WebSocket message', { 
        clientId: client.id, 
        error: (error as Error).message 
      });
      
      this.sendToClient(client, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  private handleStartConversation(client: WebSocketClient, message: any): void {
    const session = this.createSession(`ws_${Date.now()}`, {
      platform: 'websocket',
      clientId: client.id,
      startedBy: message.userInfo || {}
    });

    client.sessionId = session.id;

    // Add participants
    session.participants.push({
      id: `caller_${client.id}`,
      type: 'caller',
      name: message.userInfo?.name,
      phoneNumber: message.userInfo?.phone,
      email: message.userInfo?.email
    });

    this.sendToClient(client, {
      type: 'conversation_started',
      conversationId: session.id,
      sessionId: session.id
    });

    this.logger.info('WebSocket conversation started', { 
      clientId: client.id, 
      sessionId: session.id 
    });
  }

  private handleSendMessage(client: WebSocketClient, message: any): void {
    if (!client.sessionId) {
      this.sendToClient(client, {
        type: 'error',
        message: 'No active conversation. Start a conversation first.'
      });
      return;
    }

    const conversationMessage = this.addMessage(client.sessionId, {
      timestamp: new Date(),
      speaker: 'caller',
      content: message.content,
      metadata: {
        clientId: client.id,
        messageType: message.messageType || 'text'
      }
    });

    if (conversationMessage) {
      // Broadcast to other clients in the same conversation
      this.broadcastToConversation(client.sessionId, {
        type: 'message_received',
        message: conversationMessage
      }, client.id);
    }
  }

  private handleEndConversation(client: WebSocketClient, message: any): void {
    if (!client.sessionId) {
      return;
    }

    const session = this.getSession(client.sessionId);
    if (session) {
      this.updateSessionStatus(client.sessionId, ConversationStatus.ENDED);
      
      this.broadcastToConversation(client.sessionId, {
        type: 'conversation_ended',
        conversationId: client.sessionId
      });
    }

    client.sessionId = undefined;
    
    this.logger.info('WebSocket conversation ended', { 
      clientId: client.id, 
      sessionId: session?.id 
    });
  }

  private handleJoinConversation(client: WebSocketClient, message: any): void {
    const { conversationId } = message;
    const session = this.getSession(conversationId);
    
    if (!session) {
      this.sendToClient(client, {
        type: 'error',
        message: 'Conversation not found'
      });
      return;
    }

    client.sessionId = conversationId;
    
    // Add as agent participant
    session.participants.push({
      id: `agent_${client.id}`,
      type: 'agent',
      name: message.agentInfo?.name,
      metadata: { clientId: client.id }
    });

    this.sendToClient(client, {
      type: 'conversation_joined',
      conversationId,
      history: session.messages
    });

    this.broadcastToConversation(conversationId, {
      type: 'participant_joined',
      participant: {
        id: `agent_${client.id}`,
        type: 'agent',
        name: message.agentInfo?.name
      }
    }, client.id);
  }

  private handleClientDisconnect(client: WebSocketClient, code: number, reason: string): void {
    if (client.sessionId) {
      const session = this.getSession(client.sessionId);
      if (session && session.status === ConversationStatus.ACTIVE) {
        // Don't automatically end conversation, just remove participant
        session.participants = session.participants.filter(p => 
          !p.metadata?.clientId || p.metadata.clientId !== client.id
        );
        
        this.broadcastToConversation(client.sessionId, {
          type: 'participant_left',
          participantId: client.id
        }, client.id);
      }
    }

    this.clients.delete(client.id);
    this.logger.info('WebSocket client disconnected', { 
      clientId: client.id, 
      code, 
      reason,
      clientCount: this.clients.size 
    });
  }

  private sendToClient(client: WebSocketClient, message: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private broadcastToConversation(conversationId: string, message: any, excludeClientId?: string): void {
    const sessionClients = Array.from(this.clients.values())
      .filter(client => 
        client.sessionId === conversationId && 
        client.id !== excludeClientId
      );

    sessionClients.forEach(client => {
      this.sendToClient(client, message);
    });
  }

  private pingClients(): void {
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
      } else {
        this.clients.delete(client.id);
      }
    });
  }

  private generateClientId(): string {
    return `ws_client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }> {
    const baseHealth = await super.healthCheck();
    
    return {
      ...baseHealth,
      healthy: baseHealth.healthy && !!this.wss,
      details: {
        ...baseHealth.details,
        websocketServerRunning: !!this.wss,
        connectedClients: this.clients.size,
        port: this.config.port
      }
    };
  }

  // WebSocket-specific methods
  getConnectedClients(): WebSocketClient[] {
    return Array.from(this.clients.values());
  }

  getClientsBySession(sessionId: string): WebSocketClient[] {
    return Array.from(this.clients.values())
      .filter(client => client.sessionId === sessionId);
  }

  disconnectClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.close(1000, 'Disconnected by server');
    }
  }
}
