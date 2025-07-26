import axios, { AxiosInstance } from 'axios';
import { BaseAdapter } from './BaseAdapter';
import { 
  PlatformType, 
  ConversationMessage, 
  WebhookPayload, 
  WebhookEvent,
  ConversationStatus 
} from '../types';

interface GenesysAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
}

export class GenesysAdapter extends BaseAdapter {
  private apiClient: AxiosInstance;
  private authToken: GenesysAuthToken | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  constructor(config: Record<string, any>) {
    super(PlatformType.GENESYS, config);
    
    this.apiClient = axios.create({
      baseURL: `https://api.${config.environment}`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor to include auth token
    this.apiClient.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `${this.authToken.token_type} ${this.authToken.access_token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle auth errors
    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.authToken) {
          // Token expired, try to refresh
          await this.authenticate();
          // Retry the original request
          return this.apiClient.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  async initialize(): Promise<void> {
    try {
      await this.authenticate();
      await this.setupNotifications();
      
      this.isInitialized = true;
      this.logger.info('Genesys adapter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Genesys adapter', { error });
      throw error;
    }
  }

  async startListening(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Adapter must be initialized before starting to listen');
    }

    // Genesys uses webhooks and notifications, so we just mark as listening
    this.isListening = true;
    this.logger.info('Genesys adapter started listening for notifications');
  }

  async stopListening(): Promise<void> {
    this.isListening = false;
    
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    
    this.logger.info('Genesys adapter stopped listening');
  }

  async sendMessage(conversationId: string, message: string): Promise<void> {
    const session = this.getSession(conversationId);
    if (!session) {
      throw new Error(`Session not found: ${conversationId}`);
    }

    try {
      const conversationId_genesys = session.platformSessionId;
      
      // Send message through Genesys API
      await this.apiClient.post(`/api/v2/conversations/${conversationId_genesys}/messages`, {
        textBody: message,
        messageType: 'Text'
      });

      this.logger.info('Message sent via Genesys', { conversationId, conversationId_genesys });
    } catch (error) {
      this.logger.error('Failed to send message via Genesys', { error, conversationId });
      throw error;
    }
  }

  async getConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
    const session = this.getSession(conversationId);
    if (!session) {
      return [];
    }

    try {
      const conversationId_genesys = session.platformSessionId;
      const response = await this.apiClient.get(
        `/api/v2/conversations/${conversationId_genesys}/messages`
      );

      // Convert Genesys messages to our format
      return response.data.entities.map((msg: any) => ({
        id: msg.id,
        conversationId,
        timestamp: new Date(msg.timestamp),
        speaker: this.mapGenesysSpeaker(msg.fromUser),
        content: msg.textBody || msg.body || '',
        metadata: {
          genesysMessageId: msg.id,
          messageType: msg.messageType,
          fromUser: msg.fromUser
        }
      }));
    } catch (error) {
      this.logger.error('Failed to get conversation history from Genesys', { error, conversationId });
      return session.messages;
    }
  }

  async processWebhook(payload: WebhookPayload): Promise<void> {
    try {
      const { event, data } = payload;

      switch (event) {
        case WebhookEvent.CONVERSATION_STARTED:
          await this.handleConversationStarted(data);
          break;
        
        case WebhookEvent.MESSAGE_RECEIVED:
          await this.handleMessageReceived(data);
          break;
        
        case WebhookEvent.CONVERSATION_ENDED:
          await this.handleConversationEnded(data);
          break;
        
        case WebhookEvent.PARTICIPANT_JOINED:
          await this.handleParticipantJoined(data);
          break;
        
        case WebhookEvent.PARTICIPANT_LEFT:
          await this.handleParticipantLeft(data);
          break;
        
        default:
          this.logger.debug('Unhandled Genesys webhook event', { event });
      }
    } catch (error) {
      this.handleError(error as Error, { webhook: payload });
    }
  }

  private async authenticate(): Promise<void> {
    try {
      const response = await axios.post(
        `https://login.${this.config.environment}/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.authToken = {
        ...response.data,
        expires_at: Date.now() + (response.data.expires_in * 1000) - 60000 // 1 minute buffer
      };

      // Schedule token refresh
      this.scheduleTokenRefresh();

      this.logger.info('Genesys authentication successful');
    } catch (error) {
      this.logger.error('Genesys authentication failed', { error });
      throw error;
    }
  }

  private scheduleTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    if (this.authToken) {
      const refreshTime = this.authToken.expires_at - Date.now();
      this.tokenRefreshTimer = setTimeout(() => {
        this.authenticate().catch(error => {
          this.logger.error('Failed to refresh Genesys token', { error });
        });
      }, refreshTime);
    }
  }

  private async setupNotifications(): Promise<void> {
    try {
      // Subscribe to conversation events
      await this.apiClient.post('/api/v2/notifications/channels', {
        type: 'Webhook',
        uri: this.config.webhookUrl,
        events: [
          'v2.conversations.{id}.messages',
          'v2.conversations.{id}.participants.{participantId}.state',
          'v2.conversations.{id}.state'
        ]
      });

      this.logger.info('Genesys notifications setup complete');
    } catch (error) {
      this.logger.error('Failed to setup Genesys notifications', { error });
      throw error;
    }
  }

  private async handleConversationStarted(data: any): Promise<void> {
    const { conversationId, participants } = data;
    
    const session = this.createSession(conversationId, {
      platform: 'genesys',
      genesysData: data
    });

    // Add participants
    if (participants) {
      participants.forEach((participant: any) => {
        session.participants.push({
          id: participant.id,
          type: participant.purpose === 'customer' ? 'caller' : 'agent',
          name: participant.name,
          phoneNumber: participant.address,
          metadata: participant
        });
      });
    }

    this.logger.info('Genesys conversation started', { 
      conversationId, 
      sessionId: session.id 
    });
  }

  private async handleMessageReceived(data: any): Promise<void> {
    const { conversationId, message } = data;
    
    let session = this.getSessionByPlatformId(conversationId);
    if (!session) {
      session = this.createSession(conversationId, { platform: 'genesys' });
    }

    this.addMessage(session.id, {
      timestamp: new Date(message.timestamp),
      speaker: this.mapGenesysSpeaker(message.fromUser),
      content: message.textBody || message.body || '',
      metadata: {
        genesysMessageId: message.id,
        messageType: message.messageType,
        fromUser: message.fromUser
      }
    });
  }

  private async handleConversationEnded(data: any): Promise<void> {
    const { conversationId } = data;
    
    const session = this.getSessionByPlatformId(conversationId);
    if (session) {
      session.metadata.endData = data;
      this.updateSessionStatus(session.id, ConversationStatus.ENDED);
      
      this.logger.info('Genesys conversation ended', { 
        conversationId, 
        sessionId: session.id 
      });
    }
  }

  private async handleParticipantJoined(data: any): Promise<void> {
    const { conversationId, participant } = data;
    
    const session = this.getSessionByPlatformId(conversationId);
    if (session) {
      session.participants.push({
        id: participant.id,
        type: participant.purpose === 'customer' ? 'caller' : 'agent',
        name: participant.name,
        phoneNumber: participant.address,
        metadata: participant
      });

      this.emit('participant:joined', session, participant);
    }
  }

  private async handleParticipantLeft(data: any): Promise<void> {
    const { conversationId, participant } = data;
    
    const session = this.getSessionByPlatformId(conversationId);
    if (session) {
      session.participants = session.participants.filter(p => p.id !== participant.id);
      this.emit('participant:left', session, participant);
    }
  }

  private mapGenesysSpeaker(fromUser: any): 'caller' | 'agent' | 'system' {
    if (!fromUser) return 'system';
    if (fromUser.purpose === 'customer') return 'caller';
    if (fromUser.purpose === 'agent') return 'agent';
    return 'system';
  }

  // Genesys-specific methods
  async getConversationDetails(conversationId: string): Promise<any> {
    try {
      const response = await this.apiClient.get(`/api/v2/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch conversation details', { error, conversationId });
      throw error;
    }
  }

  async getAnalytics(conversationId: string): Promise<any> {
    try {
      const response = await this.apiClient.post('/api/v2/analytics/conversations/details/query', {
        interval: '2023-01-01T00:00:00.000Z/2024-12-31T23:59:59.999Z',
        conversationFilters: [
          {
            type: 'and',
            predicates: [
              {
                type: 'dimension',
                dimension: 'conversationId',
                operator: 'matches',
                value: conversationId
              }
            ]
          }
        ]
      });
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch conversation analytics', { error, conversationId });
      throw error;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }> {
    const baseHealth = await super.healthCheck();
    
    try {
      // Test Genesys API connectivity
      await this.apiClient.get('/api/v2/users/me');
      
      return {
        ...baseHealth,
        healthy: baseHealth.healthy && !!this.authToken,
        details: {
          ...baseHealth.details,
          genesysApiConnected: true,
          authenticated: !!this.authToken,
          tokenExpiresAt: this.authToken?.expires_at
        }
      };
    } catch (error) {
      return {
        ...baseHealth,
        healthy: false,
        details: {
          ...baseHealth.details,
          genesysApiConnected: false,
          authenticated: !!this.authToken,
          error: (error as Error).message
        }
      };
    }
  }

  async cleanup(): Promise<void> {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    
    await super.cleanup();
  }
}
