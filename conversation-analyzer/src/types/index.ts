export interface ConversationMessage {
  id: string;
  conversationId: string;
  timestamp: Date;
  speaker: 'caller' | 'agent' | 'system';
  content: string;
  metadata?: {
    phoneNumber?: string;
    agentId?: string;
    channel?: string;
    duration?: number;
    confidence?: number;
  };
}

export interface ConversationSession {
  id: string;
  platformType: PlatformType;
  platformSessionId: string;
  startTime: Date;
  endTime?: Date;
  status: ConversationStatus;
  participants: ConversationParticipant[];
  messages: ConversationMessage[];
  analysis?: ConversationAnalysis;
  caseId?: string;
  metadata: Record<string, any>;
}

export interface ConversationParticipant {
  id: string;
  type: 'caller' | 'agent';
  name?: string;
  phoneNumber?: string;
  email?: string;
  metadata?: Record<string, any>;
}

export interface ConversationAnalysis {
  overallSentiment: number;
  sentimentTrend: SentimentPoint[];
  crisisIndicators: CrisisIndicator[];
  keyPhrases: string[];
  emotionalStates: EmotionalState[];
  riskLevel: RiskLevel;
  recommendedActions: string[];
  confidence: number;
  processingTime: number;
  lastAnalyzedAt: Date;
}

export interface SentimentPoint {
  timestamp: Date;
  sentiment: number;
  confidence: number;
  messageId: string;
}

export interface CrisisIndicator {
  type: CrisisType;
  severity: number;
  confidence: number;
  keywords: string[];
  messageIds: string[];
  description: string;
}

export interface EmotionalState {
  emotion: string;
  intensity: number;
  confidence: number;
  duration: number;
  startTime: Date;
  endTime?: Date;
}

// Platform-specific types
export interface PlatformAdapter {
  platformType: PlatformType;
  initialize(): Promise<void>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  sendMessage(conversationId: string, message: string): Promise<void>;
  getConversationHistory(conversationId: string): Promise<ConversationMessage[]>;
  isHealthy(): boolean;
}

export interface WebhookPayload {
  platform: PlatformType;
  event: WebhookEvent;
  data: any;
  timestamp: Date;
  signature?: string;
}

export interface ProcessingResult {
  conversationId: string;
  analysis: ConversationAnalysis;
  actions: ProcessingAction[];
  caseCreated?: boolean;
  caseUpdated?: boolean;
  errors?: string[];
}

export interface ProcessingAction {
  type: ActionType;
  description: string;
  priority: Priority;
  automated: boolean;
  executed: boolean;
  executedAt?: Date;
  result?: any;
  error?: string;
}

// Enums
export enum PlatformType {
  TWILIO = 'twilio',
  GENESYS = 'genesys',
  WEBSOCKET = 'websocket',
  GENERIC = 'generic'
}

export enum ConversationStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
  PAUSED = 'paused',
  ERROR = 'error'
}

export enum WebhookEvent {
  CONVERSATION_STARTED = 'conversation_started',
  MESSAGE_RECEIVED = 'message_received',
  CONVERSATION_ENDED = 'conversation_ended',
  PARTICIPANT_JOINED = 'participant_joined',
  PARTICIPANT_LEFT = 'participant_left',
  RECORDING_AVAILABLE = 'recording_available'
}

export enum CrisisType {
  MENTAL_HEALTH = 'mental_health',
  DOMESTIC_VIOLENCE = 'domestic_violence',
  SUBSTANCE_ABUSE = 'substance_abuse',
  CHILD_WELFARE = 'child_welfare',
  ELDER_ABUSE = 'elder_abuse',
  GENERAL_EMERGENCY = 'general_emergency',
  SUICIDE_RISK = 'suicide_risk',
  VIOLENCE_THREAT = 'violence_threat'
}

export enum RiskLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  IMMINENT = 'imminent'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ActionType {
  CREATE_CASE = 'create_case',
  UPDATE_CASE = 'update_case',
  ALERT_SUPERVISOR = 'alert_supervisor',
  ESCALATE_CALL = 'escalate_call',
  SEND_RESOURCES = 'send_resources',
  SCHEDULE_FOLLOWUP = 'schedule_followup',
  TRANSFER_CALL = 'transfer_call'
}

// Configuration types
export interface AdapterConfig {
  platformType: PlatformType;
  enabled: boolean;
  config: Record<string, any>;
}

export interface AnalysisConfig {
  batchSize: number;
  intervalMs: number;
  sentimentThreshold: number;
  crisisKeywordsThreshold: number;
  autoCaseCreation: boolean;
  realTimeAnalysis: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// Case Record API types (imported from case-record-app)
export interface CaseRecordPayload {
  crisisType: string;
  priority: string;
  createdBy: string;
  lastModifiedBy: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    email?: string;
  };
  crisisDetails: {
    description: string;
    location: string;
    dateTime: Date;
    riskFactors?: string[];
    immediateNeeds?: string[];
  };
  assessment: {
    riskLevel: string;
    sentimentScore?: number;
    emotionalState?: string[];
    recommendations?: string[];
  };
  actions?: any[];
}

// Real-time events
export interface RealtimeEvent {
  type: string;
  conversationId: string;
  data: any;
  timestamp: Date;
}

export interface ConversationUpdate {
  conversationId: string;
  type: 'message' | 'analysis' | 'status' | 'participant';
  data: any;
  timestamp: Date;
}
