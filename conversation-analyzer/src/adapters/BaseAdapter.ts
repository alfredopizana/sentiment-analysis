import { EventEmitter } from 'eventemitter3';
import { 
  PlatformAdapter, 
  PlatformType, 
  ConversationMessage, 
  ConversationSession,
  ConversationStatus,
  WebhookPayload 
} from '../types';
import { createLogger } from '../utils/logger';

export abstract class BaseAdapter extends EventEmitter implements PlatformAdapter {
  protected logger = createLogger(this.constructor.name);
  protected sessions = new Map<string, ConversationSession>();
  protected isInitialized = false;
  protected isListening = false;

  constructor(
    public readonly platformType: PlatformType,
    protected config: Record<string, any>
  ) {
    super();
  }

  abstract initialize(): Promise<void>;
  abstract startListening(): Promise<void>;
  abstract stopListening(): Promise<void>;
  abstract sendMessage(conversationId: string, message: string): Promise<void>;
  abstract getConversationHistory(conversationId: string): Promise<ConversationMessage[]>;
  abstract processWebhook(payload: WebhookPayload): Promise<void>;

  isHealthy(): boolean {
    return this.isInitialized && this.isListening;
  }

  protected createSession(
    platformSessionId: string,
    metadata: Record<string, any> = {}
  ): ConversationSession {
    const session: ConversationSession = {
      id: this.generateSessionId(),
      platformType: this.platformType,
      platformSessionId,
      startTime: new Date(),
      status: ConversationStatus.ACTIVE,
      participants: [],
      messages: [],
      metadata
    };

    this.sessions.set(session.id, session);
    this.logger.info('Created new conversation session', {
      sessionId: session.id,
      platformSessionId,
      platform: this.platformType
    });

    this.emit('session:created', session);
    return session;
  }

  protected addMessage(
    sessionId: string,
    message: Omit<ConversationMessage, 'id' | 'conversationId'>
  ): ConversationMessage | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn('Attempted to add message to non-existent session', { sessionId });
      return null;
    }

    const fullMessage: ConversationMessage = {
      id: this.generateMessageId(),
      conversationId: sessionId,
      ...message
    };

    session.messages.push(fullMessage);
    
    this.logger.debug('Added message to session', {
      sessionId,
      messageId: fullMessage.id,
      speaker: fullMessage.speaker,
      contentLength: fullMessage.content.length
    });

    this.emit('message:received', fullMessage, session);
    return fullMessage;
  }

  protected updateSessionStatus(sessionId: string, status: ConversationStatus): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn('Attempted to update status of non-existent session', { sessionId });
      return;
    }

    const previousStatus = session.status;
    session.status = status;

    if (status === ConversationStatus.ENDED) {
      session.endTime = new Date();
    }

    this.logger.info('Updated session status', {
      sessionId,
      previousStatus,
      newStatus: status
    });

    this.emit('session:status_changed', session, previousStatus);

    if (status === ConversationStatus.ENDED) {
      this.emit('session:ended', session);
    }
  }

  protected getSession(sessionId: string): ConversationSession | undefined {
    return this.sessions.get(sessionId);
  }

  protected getSessionByPlatformId(platformSessionId: string): ConversationSession | undefined {
    return Array.from(this.sessions.values()).find(
      session => session.platformSessionId === platformSessionId
    );
  }

  protected getAllSessions(): ConversationSession[] {
    return Array.from(this.sessions.values());
  }

  protected removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      this.logger.info('Removed session', { sessionId });
      this.emit('session:removed', session);
    }
  }

  protected generateSessionId(): string {
    return `${this.platformType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected validateWebhookSignature(payload: WebhookPayload): boolean {
    // Override in specific adapters for signature validation
    return true;
  }

  protected handleError(error: Error, context: Record<string, any> = {}): void {
    this.logger.error('Adapter error', { error: error.message, stack: error.stack, ...context });
    this.emit('error', error, context);
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    try {
      await this.stopListening();
      this.sessions.clear();
      this.removeAllListeners();
      this.logger.info('Adapter cleaned up successfully');
    } catch (error) {
      this.logger.error('Error during adapter cleanup', { error });
    }
  }

  // Health check method
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }> {
    return {
      healthy: this.isHealthy(),
      details: {
        initialized: this.isInitialized,
        listening: this.isListening,
        activeSessions: this.sessions.size,
        platform: this.platformType
      }
    };
  }
}
