import twilio from 'twilio';
import { BaseAdapter } from './BaseAdapter';
import { 
  PlatformType, 
  ConversationMessage, 
  WebhookPayload, 
  WebhookEvent,
  ConversationStatus 
} from '../types';

export class TwilioAdapter extends BaseAdapter {
  private twilioClient: twilio.Twilio;
  private webhookValidator: twilio.webhooks.RequestValidator;

  constructor(config: Record<string, any>) {
    super(PlatformType.TWILIO, config);
    
    this.twilioClient = twilio(config.accountSid, config.authToken);
    this.webhookValidator = new twilio.webhooks.RequestValidator(config.authToken);
  }

  async initialize(): Promise<void> {
    try {
      // Verify Twilio credentials
      await this.twilioClient.api.accounts(this.config.accountSid).fetch();
      
      this.isInitialized = true;
      this.logger.info('Twilio adapter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Twilio adapter', { error });
      throw error;
    }
  }

  async startListening(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Adapter must be initialized before starting to listen');
    }

    // Twilio uses webhooks, so we just mark as listening
    this.isListening = true;
    this.logger.info('Twilio adapter started listening for webhooks');
  }

  async stopListening(): Promise<void> {
    this.isListening = false;
    this.logger.info('Twilio adapter stopped listening');
  }

  async sendMessage(conversationId: string, message: string): Promise<void> {
    const session = this.getSession(conversationId);
    if (!session) {
      throw new Error(`Session not found: ${conversationId}`);
    }

    try {
      // For voice calls, we would use TwiML to speak the message
      // For SMS, we would send an SMS message
      const callSid = session.platformSessionId;
      
      // Example: Update call with TwiML to speak message
      await this.twilioClient.calls(callSid).update({
        twiml: `<Response><Say>${message}</Say></Response>`
      });

      this.logger.info('Message sent via Twilio', { conversationId, callSid });
    } catch (error) {
      this.logger.error('Failed to send message via Twilio', { error, conversationId });
      throw error;
    }
  }

  async getConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
    const session = this.getSession(conversationId);
    return session ? session.messages : [];
  }

  async processWebhook(payload: WebhookPayload): Promise<void> {
    try {
      // Validate webhook signature if provided
      if (payload.signature && !this.validateWebhookSignature(payload)) {
        this.logger.warn('Invalid webhook signature', { event: payload.event });
        return;
      }

      const { event, data } = payload;

      switch (event) {
        case WebhookEvent.CONVERSATION_STARTED:
          await this.handleCallStarted(data);
          break;
        
        case WebhookEvent.MESSAGE_RECEIVED:
          await this.handleMessageReceived(data);
          break;
        
        case WebhookEvent.CONVERSATION_ENDED:
          await this.handleCallEnded(data);
          break;
        
        case WebhookEvent.RECORDING_AVAILABLE:
          await this.handleRecordingAvailable(data);
          break;
        
        default:
          this.logger.debug('Unhandled webhook event', { event });
      }
    } catch (error) {
      this.handleError(error as Error, { webhook: payload });
    }
  }

  private async handleCallStarted(data: any): Promise<void> {
    const { CallSid, From, To, Direction } = data;
    
    const session = this.createSession(CallSid, {
      from: From,
      to: To,
      direction: Direction,
      platform: 'twilio'
    });

    // Add participants
    session.participants.push(
      {
        id: `caller_${CallSid}`,
        type: 'caller',
        phoneNumber: From
      },
      {
        id: `agent_${CallSid}`,
        type: 'agent',
        phoneNumber: To
      }
    );

    this.logger.info('Twilio call started', { 
      callSid: CallSid, 
      sessionId: session.id,
      from: From,
      to: To 
    });
  }

  private async handleMessageReceived(data: any): Promise<void> {
    const { CallSid, SpeechResult, Confidence, From } = data;
    
    let session = this.getSessionByPlatformId(CallSid);
    if (!session) {
      // Create session if it doesn't exist (for SMS or missed call start)
      session = this.createSession(CallSid, { from: From, platform: 'twilio' });
    }

    if (SpeechResult) {
      // Voice transcription
      this.addMessage(session.id, {
        timestamp: new Date(),
        speaker: 'caller',
        content: SpeechResult,
        metadata: {
          confidence: Confidence,
          phoneNumber: From
        }
      });
    } else if (data.Body) {
      // SMS message
      this.addMessage(session.id, {
        timestamp: new Date(),
        speaker: 'caller',
        content: data.Body,
        metadata: {
          phoneNumber: From,
          messageType: 'sms'
        }
      });
    }
  }

  private async handleCallEnded(data: any): Promise<void> {
    const { CallSid, CallDuration, CallStatus } = data;
    
    const session = this.getSessionByPlatformId(CallSid);
    if (session) {
      session.metadata.duration = CallDuration;
      session.metadata.status = CallStatus;
      
      this.updateSessionStatus(session.id, ConversationStatus.ENDED);
      
      this.logger.info('Twilio call ended', { 
        callSid: CallSid, 
        sessionId: session.id,
        duration: CallDuration 
      });
    }
  }

  private async handleRecordingAvailable(data: any): Promise<void> {
    const { CallSid, RecordingUrl, RecordingSid } = data;
    
    const session = this.getSessionByPlatformId(CallSid);
    if (session) {
      session.metadata.recordingUrl = RecordingUrl;
      session.metadata.recordingSid = RecordingSid;
      
      this.emit('recording:available', session, RecordingUrl);
      
      this.logger.info('Twilio recording available', { 
        callSid: CallSid, 
        sessionId: session.id,
        recordingUrl: RecordingUrl 
      });
    }
  }

  protected validateWebhookSignature(payload: WebhookPayload): boolean {
    if (!payload.signature) return false;
    
    try {
      const url = this.config.webhookUrl;
      const params = payload.data;
      
      return this.webhookValidator.validate(url, params, payload.signature);
    } catch (error) {
      this.logger.error('Error validating Twilio webhook signature', { error });
      return false;
    }
  }

  // Twilio-specific methods
  async getCallDetails(callSid: string): Promise<any> {
    try {
      return await this.twilioClient.calls(callSid).fetch();
    } catch (error) {
      this.logger.error('Failed to fetch call details', { error, callSid });
      throw error;
    }
  }

  async getRecording(recordingSid: string): Promise<any> {
    try {
      return await this.twilioClient.recordings(recordingSid).fetch();
    } catch (error) {
      this.logger.error('Failed to fetch recording', { error, recordingSid });
      throw error;
    }
  }

  async transcribeRecording(recordingSid: string): Promise<string> {
    try {
      // Twilio doesn't provide built-in transcription for recordings
      // This would integrate with a transcription service
      const recording = await this.getRecording(recordingSid);
      
      // TODO: Integrate with transcription service (Google Speech-to-Text, AWS Transcribe, etc.)
      this.logger.info('Recording transcription requested', { recordingSid });
      
      return 'Transcription not implemented yet';
    } catch (error) {
      this.logger.error('Failed to transcribe recording', { error, recordingSid });
      throw error;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }> {
    const baseHealth = await super.healthCheck();
    
    try {
      // Test Twilio API connectivity
      await this.twilioClient.api.accounts(this.config.accountSid).fetch();
      
      return {
        ...baseHealth,
        healthy: baseHealth.healthy && true,
        details: {
          ...baseHealth.details,
          twilioApiConnected: true,
          accountSid: this.config.accountSid
        }
      };
    } catch (error) {
      return {
        ...baseHealth,
        healthy: false,
        details: {
          ...baseHealth.details,
          twilioApiConnected: false,
          error: (error as Error).message
        }
      };
    }
  }
}
