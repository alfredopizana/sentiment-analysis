export interface CaseRecord {
  _id?: string;
  caseNumber: string;
  crisisType: CrisisType;
  status: CaseStatus;
  priority: Priority;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
  
  // Personal Information
  personalInfo: PersonalInfo;
  
  // Crisis-specific fields
  crisisDetails: CrisisDetails;
  
  // Assessment and Analysis
  assessment: Assessment;
  
  // Actions and Follow-up
  actions: Action[];
  
  // Field tracking for AI updates
  fieldUpdates: FieldUpdate[];
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: Gender;
  phoneNumber?: string;
  email?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
}

export interface CrisisDetails {
  description: string;
  location: string;
  dateTime: Date;
  witnesses?: string[];
  involvedParties?: string[];
  riskFactors?: string[];
  immediateNeeds?: string[];
  
  // Crisis-specific fields based on type
  mentalHealthDetails?: MentalHealthDetails;
  domesticViolenceDetails?: DomesticViolenceDetails;
  substanceAbuseDetails?: SubstanceAbuseDetails;
  childWelfareDetails?: ChildWelfareDetails;
  elderAbuseDetails?: ElderAbuseDetails;
}

export interface MentalHealthDetails {
  suicidalIdeation: boolean;
  selfHarmRisk: boolean;
  previousAttempts: boolean;
  mentalHealthHistory?: string;
  currentMedications?: string[];
  triggerEvents?: string[];
}

export interface DomesticViolenceDetails {
  relationshipToAbuser: string;
  violenceType: ViolenceType[];
  childrenInvolved: boolean;
  safetyPlan: boolean;
  previousIncidents: boolean;
  restrainingOrder: boolean;
}

export interface SubstanceAbuseDetails {
  substanceType: string[];
  lastUse: Date;
  overdoseRisk: boolean;
  withdrawalSymptoms: boolean;
  previousTreatment: boolean;
  supportSystem: boolean;
}

export interface ChildWelfareDetails {
  childAge: number;
  abuseType: AbuseType[];
  parentGuardianPresent: boolean;
  schoolInvolvement: boolean;
  medicalAttention: boolean;
  safetyPlan: boolean;
}

export interface ElderAbuseDetails {
  elderAge: number;
  abuseType: AbuseType[];
  caregiverRelationship: string;
  cognitiveImpairment: boolean;
  financialExploitation: boolean;
  medicalNeglect: boolean;
}

export interface Assessment {
  riskLevel: RiskLevel;
  sentimentScore?: number;
  emotionalState?: EmotionalState[];
  cognitiveState?: string;
  physicalCondition?: string;
  socialSupport?: string;
  copingMechanisms?: string[];
  strengths?: string[];
  concerns?: string[];
  recommendations?: string[];
}

export interface Action {
  _id?: string;
  type: ActionType;
  description: string;
  assignedTo: string;
  dueDate?: Date;
  completedDate?: Date;
  status: ActionStatus;
  priority: Priority;
  notes?: string;
}

export interface FieldUpdate {
  fieldPath: string;
  updateType: UpdateType;
  updatedBy: UpdateSource;
  timestamp: Date;
  previousValue?: any;
  newValue: any;
  confidence?: number; // For AI updates
  userOverride?: boolean;
}

// Enums
export enum CrisisType {
  MENTAL_HEALTH = 'mental_health',
  DOMESTIC_VIOLENCE = 'domestic_violence',
  SUBSTANCE_ABUSE = 'substance_abuse',
  CHILD_WELFARE = 'child_welfare',
  ELDER_ABUSE = 'elder_abuse',
  GENERAL_EMERGENCY = 'general_emergency'
}

export enum CaseStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  NON_BINARY = 'non_binary',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export enum ViolenceType {
  PHYSICAL = 'physical',
  EMOTIONAL = 'emotional',
  SEXUAL = 'sexual',
  FINANCIAL = 'financial',
  PSYCHOLOGICAL = 'psychological'
}

export enum AbuseType {
  PHYSICAL = 'physical',
  EMOTIONAL = 'emotional',
  SEXUAL = 'sexual',
  NEGLECT = 'neglect',
  FINANCIAL = 'financial'
}

export enum RiskLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  IMMINENT = 'imminent'
}

export enum EmotionalState {
  ANXIOUS = 'anxious',
  DEPRESSED = 'depressed',
  ANGRY = 'angry',
  FEARFUL = 'fearful',
  HOPELESS = 'hopeless',
  CONFUSED = 'confused',
  CALM = 'calm',
  COOPERATIVE = 'cooperative'
}

export enum ActionType {
  IMMEDIATE_RESPONSE = 'immediate_response',
  FOLLOW_UP = 'follow_up',
  REFERRAL = 'referral',
  DOCUMENTATION = 'documentation',
  SAFETY_PLANNING = 'safety_planning',
  RESOURCE_COORDINATION = 'resource_coordination'
}

export enum ActionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum UpdateType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

export enum UpdateSource {
  USER = 'user',
  AI_SENTIMENT_ANALYSIS = 'ai_sentiment_analysis',
  SYSTEM = 'system'
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Form Types
export interface CaseFormData extends Omit<CaseRecord, '_id' | 'createdAt' | 'updatedAt' | 'fieldUpdates'> {}

// Sentiment Analysis Types
export interface SentimentAnalysisRequest {
  text: string;
  context?: string;
  crisisType: CrisisType;
}

export interface SentimentAnalysisResponse {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  emotions: {
    [key in EmotionalState]?: number;
  };
  riskIndicators: {
    suicidal: number;
    violence: number;
    substance: number;
    neglect: number;
  };
  recommendations: string[];
}
