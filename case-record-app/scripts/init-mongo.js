// MongoDB initialization script
db = db.getSiblingDB('case-record-db');

// Create collections
db.createCollection('caserecords');

// Create indexes for better performance
db.caserecords.createIndex({ "caseNumber": 1 }, { unique: true });
db.caserecords.createIndex({ "crisisType": 1 });
db.caserecords.createIndex({ "status": 1 });
db.caserecords.createIndex({ "priority": 1 });
db.caserecords.createIndex({ "assessment.riskLevel": 1 });
db.caserecords.createIndex({ "createdAt": -1 });
db.caserecords.createIndex({ "updatedAt": -1 });
db.caserecords.createIndex({ 
  "personalInfo.firstName": "text", 
  "personalInfo.lastName": "text",
  "crisisDetails.description": "text"
});

print('Database initialized successfully');

// Insert sample data for development
const sampleCases = [
  {
    caseNumber: "CR-2024-000001",
    crisisType: "mental_health",
    status: "open",
    priority: "high",
    createdBy: "system",
    lastModifiedBy: "system",
    personalInfo: {
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "555-0123",
      email: "john.doe@example.com"
    },
    crisisDetails: {
      description: "Individual expressing suicidal thoughts and appears highly distressed. Reported feeling hopeless and isolated.",
      location: "123 Main St, Downtown",
      dateTime: new Date(),
      riskFactors: ["suicidal ideation", "social isolation", "recent job loss"],
      immediateNeeds: ["safety assessment", "mental health evaluation", "crisis counseling"],
      mentalHealthDetails: {
        suicidalIdeation: true,
        selfHarmRisk: true,
        previousAttempts: false,
        mentalHealthHistory: "History of depression and anxiety, previously hospitalized 2 years ago"
      }
    },
    assessment: {
      riskLevel: "high",
      sentimentScore: -0.8,
      emotionalState: ["anxious", "depressed", "hopeless"],
      cognitiveState: "Alert but severely distressed",
      recommendations: ["Immediate psychiatric evaluation", "Safety planning", "Crisis intervention"]
    },
    actions: [],
    fieldUpdates: [
      {
        fieldPath: "assessment.sentimentScore",
        updateType: "update",
        updatedBy: "ai_sentiment_analysis",
        timestamp: new Date(),
        newValue: -0.8,
        confidence: 0.85
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    caseNumber: "CR-2024-000002",
    crisisType: "domestic_violence",
    status: "in_progress",
    priority: "critical",
    createdBy: "system",
    lastModifiedBy: "system",
    personalInfo: {
      firstName: "Jane",
      lastName: "Smith",
      phoneNumber: "555-0456",
      email: "jane.smith@example.com"
    },
    crisisDetails: {
      description: "Victim of domestic violence seeking immediate shelter and protection. Visible injuries reported.",
      location: "456 Oak Ave, Residential Area",
      dateTime: new Date(Date.now() - 86400000), // 1 day ago
      riskFactors: ["physical violence", "escalating threats", "children involved"],
      immediateNeeds: ["safe shelter", "medical attention", "legal protection"],
      domesticViolenceDetails: {
        relationshipToAbuser: "spouse",
        violenceType: ["physical", "emotional", "psychological"],
        childrenInvolved: true,
        safetyPlan: false,
        previousIncidents: true,
        restrainingOrder: false
      }
    },
    assessment: {
      riskLevel: "imminent",
      sentimentScore: -0.9,
      emotionalState: ["fearful", "anxious"],
      cognitiveState: "Alert, coherent but traumatized",
      recommendations: ["Immediate safety planning", "Emergency shelter placement", "Legal advocacy"]
    },
    actions: [
      {
        type: "immediate_response",
        description: "Arrange emergency shelter placement",
        assignedTo: "Crisis Counselor A",
        status: "in_progress",
        priority: "critical"
      }
    ],
    fieldUpdates: [],
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date()
  }
];

db.caserecords.insertMany(sampleCases);
print('Sample data inserted successfully');
