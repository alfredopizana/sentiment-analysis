import Joi from 'joi';
import { CrisisType, CaseStatus, Priority, Gender, RiskLevel, ActionType, ActionStatus } from '../types';

// Personal Info Validation
const personalInfoSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  dateOfBirth: Joi.date().max('now'),
  gender: Joi.string().valid(...Object.values(Gender)),
  phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
  email: Joi.string().email(),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    country: Joi.string().default('USA')
  }),
  emergencyContact: Joi.object({
    name: Joi.string().required(),
    relationship: Joi.string().required(),
    phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required()
  })
});

// Crisis Details Validation
const crisisDetailsSchema = Joi.object({
  description: Joi.string().min(10).max(2000).required(),
  location: Joi.string().min(5).max(200).required(),
  dateTime: Joi.date().max('now').required(),
  witnesses: Joi.array().items(Joi.string()),
  involvedParties: Joi.array().items(Joi.string()),
  riskFactors: Joi.array().items(Joi.string()),
  immediateNeeds: Joi.array().items(Joi.string()),
  
  // Crisis-specific details (conditional validation based on crisis type)
  mentalHealthDetails: Joi.object({
    suicidalIdeation: Joi.boolean(),
    selfHarmRisk: Joi.boolean(),
    previousAttempts: Joi.boolean(),
    mentalHealthHistory: Joi.string().max(1000),
    currentMedications: Joi.array().items(Joi.string()),
    triggerEvents: Joi.array().items(Joi.string())
  }),
  
  domesticViolenceDetails: Joi.object({
    relationshipToAbuser: Joi.string().required(),
    violenceType: Joi.array().items(Joi.string()),
    childrenInvolved: Joi.boolean(),
    safetyPlan: Joi.boolean(),
    previousIncidents: Joi.boolean(),
    restrainingOrder: Joi.boolean()
  }),
  
  substanceAbuseDetails: Joi.object({
    substanceType: Joi.array().items(Joi.string()),
    lastUse: Joi.date(),
    overdoseRisk: Joi.boolean(),
    withdrawalSymptoms: Joi.boolean(),
    previousTreatment: Joi.boolean(),
    supportSystem: Joi.boolean()
  }),
  
  childWelfareDetails: Joi.object({
    childAge: Joi.number().min(0).max(18).required(),
    abuseType: Joi.array().items(Joi.string()),
    parentGuardianPresent: Joi.boolean(),
    schoolInvolvement: Joi.boolean(),
    medicalAttention: Joi.boolean(),
    safetyPlan: Joi.boolean()
  }),
  
  elderAbuseDetails: Joi.object({
    elderAge: Joi.number().min(60).max(120).required(),
    abuseType: Joi.array().items(Joi.string()),
    caregiverRelationship: Joi.string().required(),
    cognitiveImpairment: Joi.boolean(),
    financialExploitation: Joi.boolean(),
    medicalNeglect: Joi.boolean()
  })
});

// Assessment Validation
const assessmentSchema = Joi.object({
  riskLevel: Joi.string().valid(...Object.values(RiskLevel)).required(),
  sentimentScore: Joi.number().min(-1).max(1),
  emotionalState: Joi.array().items(Joi.string()),
  cognitiveState: Joi.string().max(500),
  physicalCondition: Joi.string().max(500),
  socialSupport: Joi.string().max(500),
  copingMechanisms: Joi.array().items(Joi.string()),
  strengths: Joi.array().items(Joi.string()),
  concerns: Joi.array().items(Joi.string()),
  recommendations: Joi.array().items(Joi.string())
});

// Action Validation
const actionSchema = Joi.object({
  type: Joi.string().valid(...Object.values(ActionType)).required(),
  description: Joi.string().min(10).max(500).required(),
  assignedTo: Joi.string().required(),
  dueDate: Joi.date().min('now'),
  completedDate: Joi.date(),
  status: Joi.string().valid(...Object.values(ActionStatus)),
  priority: Joi.string().valid(...Object.values(Priority)).required(),
  notes: Joi.string().max(1000)
});

// Main Case Record Validation
export const createCaseRecordSchema = Joi.object({
  crisisType: Joi.string().valid(...Object.values(CrisisType)).required(),
  priority: Joi.string().valid(...Object.values(Priority)).required(),
  createdBy: Joi.string().required(),
  lastModifiedBy: Joi.string().required(),
  personalInfo: personalInfoSchema.required(),
  crisisDetails: crisisDetailsSchema.required(),
  assessment: assessmentSchema.required(),
  actions: Joi.array().items(actionSchema).default([])
});

export const updateCaseRecordSchema = Joi.object({
  crisisType: Joi.string().valid(...Object.values(CrisisType)),
  status: Joi.string().valid(...Object.values(CaseStatus)),
  priority: Joi.string().valid(...Object.values(Priority)),
  lastModifiedBy: Joi.string().required(),
  personalInfo: personalInfoSchema,
  crisisDetails: crisisDetailsSchema,
  assessment: assessmentSchema,
  actions: Joi.array().items(actionSchema)
});

// Query Parameters Validation
export const getCasesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid(...Object.values(CaseStatus)),
  crisisType: Joi.string().valid(...Object.values(CrisisType)),
  priority: Joi.string().valid(...Object.values(Priority)),
  riskLevel: Joi.string().valid(...Object.values(RiskLevel)),
  search: Joi.string().max(100),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'priority', 'riskLevel').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Sentiment Analysis Request Validation
export const sentimentAnalysisSchema = Joi.object({
  text: Joi.string().min(10).max(5000).required(),
  context: Joi.string().max(500),
  crisisType: Joi.string().valid(...Object.values(CrisisType)).required()
});

// Validation middleware
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    req.body = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        errors
      });
    }
    
    req.query = value;
    next();
  };
};
