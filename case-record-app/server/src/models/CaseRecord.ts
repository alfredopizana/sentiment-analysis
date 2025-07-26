import mongoose, { Schema, Document } from 'mongoose';
import {
  CaseRecord as ICaseRecord,
  CrisisType,
  CaseStatus,
  Priority,
  Gender,
  ViolenceType,
  AbuseType,
  RiskLevel,
  EmotionalState,
  ActionType,
  ActionStatus,
  UpdateType,
  UpdateSource
} from '../types';

export interface CaseRecordDocument extends Omit<ICaseRecord, '_id'>, Document {}

const AddressSchema = new Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, default: 'USA' }
});

const EmergencyContactSchema = new Schema({
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  phoneNumber: { type: String, required: true }
});

const PersonalInfoSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: Object.values(Gender) },
  phoneNumber: { type: String },
  email: { type: String },
  address: AddressSchema,
  emergencyContact: EmergencyContactSchema
});

const MentalHealthDetailsSchema = new Schema({
  suicidalIdeation: { type: Boolean, default: false },
  selfHarmRisk: { type: Boolean, default: false },
  previousAttempts: { type: Boolean, default: false },
  mentalHealthHistory: { type: String },
  currentMedications: [{ type: String }],
  triggerEvents: [{ type: String }]
});

const DomesticViolenceDetailsSchema = new Schema({
  relationshipToAbuser: { type: String, required: true },
  violenceType: [{ type: String, enum: Object.values(ViolenceType) }],
  childrenInvolved: { type: Boolean, default: false },
  safetyPlan: { type: Boolean, default: false },
  previousIncidents: { type: Boolean, default: false },
  restrainingOrder: { type: Boolean, default: false }
});

const SubstanceAbuseDetailsSchema = new Schema({
  substanceType: [{ type: String }],
  lastUse: { type: Date },
  overdoseRisk: { type: Boolean, default: false },
  withdrawalSymptoms: { type: Boolean, default: false },
  previousTreatment: { type: Boolean, default: false },
  supportSystem: { type: Boolean, default: false }
});

const ChildWelfareDetailsSchema = new Schema({
  childAge: { type: Number, required: true },
  abuseType: [{ type: String, enum: Object.values(AbuseType) }],
  parentGuardianPresent: { type: Boolean, default: false },
  schoolInvolvement: { type: Boolean, default: false },
  medicalAttention: { type: Boolean, default: false },
  safetyPlan: { type: Boolean, default: false }
});

const ElderAbuseDetailsSchema = new Schema({
  elderAge: { type: Number, required: true },
  abuseType: [{ type: String, enum: Object.values(AbuseType) }],
  caregiverRelationship: { type: String, required: true },
  cognitiveImpairment: { type: Boolean, default: false },
  financialExploitation: { type: Boolean, default: false },
  medicalNeglect: { type: Boolean, default: false }
});

const CrisisDetailsSchema = new Schema({
  description: { type: String, required: true },
  location: { type: String, required: true },
  dateTime: { type: Date, required: true },
  witnesses: [{ type: String }],
  involvedParties: [{ type: String }],
  riskFactors: [{ type: String }],
  immediateNeeds: [{ type: String }],
  mentalHealthDetails: MentalHealthDetailsSchema,
  domesticViolenceDetails: DomesticViolenceDetailsSchema,
  substanceAbuseDetails: SubstanceAbuseDetailsSchema,
  childWelfareDetails: ChildWelfareDetailsSchema,
  elderAbuseDetails: ElderAbuseDetailsSchema
});

const AssessmentSchema = new Schema({
  riskLevel: { type: String, enum: Object.values(RiskLevel), required: true },
  sentimentScore: { type: Number, min: -1, max: 1 },
  emotionalState: [{ type: String, enum: Object.values(EmotionalState) }],
  cognitiveState: { type: String },
  physicalCondition: { type: String },
  socialSupport: { type: String },
  copingMechanisms: [{ type: String }],
  strengths: [{ type: String }],
  concerns: [{ type: String }],
  recommendations: [{ type: String }]
});

const ActionSchema = new Schema({
  type: { type: String, enum: Object.values(ActionType), required: true },
  description: { type: String, required: true },
  assignedTo: { type: String, required: true },
  dueDate: { type: Date },
  completedDate: { type: Date },
  status: { type: String, enum: Object.values(ActionStatus), default: ActionStatus.PENDING },
  priority: { type: String, enum: Object.values(Priority), required: true },
  notes: { type: String }
});

const FieldUpdateSchema = new Schema({
  fieldPath: { type: String, required: true },
  updateType: { type: String, enum: Object.values(UpdateType), required: true },
  updatedBy: { type: String, enum: Object.values(UpdateSource), required: true },
  timestamp: { type: Date, default: Date.now },
  previousValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed, required: true },
  confidence: { type: Number, min: 0, max: 1 },
  userOverride: { type: Boolean, default: false }
});

const CaseRecordSchema = new Schema({
  caseNumber: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  crisisType: { 
    type: String, 
    enum: Object.values(CrisisType), 
    required: true,
    index: true
  },
  status: { 
    type: String, 
    enum: Object.values(CaseStatus), 
    default: CaseStatus.OPEN,
    index: true
  },
  priority: { 
    type: String, 
    enum: Object.values(Priority), 
    required: true,
    index: true
  },
  createdBy: { type: String, required: true },
  lastModifiedBy: { type: String, required: true },
  
  personalInfo: { type: PersonalInfoSchema, required: true },
  crisisDetails: { type: CrisisDetailsSchema, required: true },
  assessment: { type: AssessmentSchema, required: true },
  actions: [ActionSchema],
  fieldUpdates: [FieldUpdateSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
CaseRecordSchema.index({ createdAt: -1 });
CaseRecordSchema.index({ updatedAt: -1 });
CaseRecordSchema.index({ 'personalInfo.lastName': 1, 'personalInfo.firstName': 1 });
CaseRecordSchema.index({ 'assessment.riskLevel': 1 });

// Virtual for full name
CaseRecordSchema.virtual('personalInfo.fullName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// Pre-save middleware to generate case number
CaseRecordSchema.pre('save', async function(next) {
  if (this.isNew && !this.caseNumber) {
    const count = await mongoose.model('CaseRecord').countDocuments();
    const year = new Date().getFullYear();
    this.caseNumber = `CR-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Method to add field update tracking
CaseRecordSchema.methods.addFieldUpdate = function(
  fieldPath: string,
  newValue: any,
  updatedBy: UpdateSource,
  previousValue?: any,
  confidence?: number
) {
  this.fieldUpdates.push({
    fieldPath,
    updateType: UpdateType.UPDATE,
    updatedBy,
    timestamp: new Date(),
    previousValue,
    newValue,
    confidence,
    userOverride: updatedBy === UpdateSource.USER && 
      this.fieldUpdates.some((update: any) => 
        update.fieldPath === fieldPath && 
        update.updatedBy === UpdateSource.AI_SENTIMENT_ANALYSIS
      )
  });
};

// Method to get latest update for a field
CaseRecordSchema.methods.getLatestFieldUpdate = function(fieldPath: string) {
  return this.fieldUpdates
    .filter((update: any) => update.fieldPath === fieldPath)
    .sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime())[0];
};

export const CaseRecord = mongoose.model<CaseRecordDocument>('CaseRecord', CaseRecordSchema);
