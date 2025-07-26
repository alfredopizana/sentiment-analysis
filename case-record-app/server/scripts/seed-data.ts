import mongoose from 'mongoose';
import { CaseRecord } from '../src/models/CaseRecord';
import { config } from '../src/config/config';
import { CrisisType, CaseStatus, Priority, RiskLevel, Gender } from '../src/types';

const sampleCases = [
  {
    caseNumber: 'CASE-2025-001',
    crisisType: CrisisType.MENTAL_HEALTH,
    status: CaseStatus.OPEN,
    priority: Priority.HIGH,
    createdBy: 'system',
    lastModifiedBy: 'system',
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '555-0123',
      email: 'john.doe@example.com',
      gender: Gender.MALE,
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'USA'
      }
    },
    crisisDetails: {
      description: 'Individual experiencing severe anxiety and panic attacks',
      location: '123 Main St, Anytown, CA',
      dateTime: new Date(),
      witnesses: [],
      involvedParties: [],
      riskFactors: ['anxiety', 'panic disorder'],
      immediateNeeds: ['mental health assessment', 'crisis intervention']
    },
    assessment: {
      riskLevel: RiskLevel.HIGH,
      emotionalState: ['anxious', 'fearful'],
      cognitiveState: 'Alert but distressed',
      physicalCondition: 'No immediate physical concerns',
      socialSupport: 'Limited family support available',
      copingMechanisms: ['breathing exercises'],
      strengths: ['willing to seek help'],
      concerns: ['escalating anxiety', 'panic attacks'],
      recommendations: ['immediate mental health evaluation', 'crisis counseling']
    },
    actions: []
  },
  {
    caseNumber: 'CASE-2025-002',
    crisisType: CrisisType.DOMESTIC_VIOLENCE,
    status: CaseStatus.IN_PROGRESS,
    priority: Priority.CRITICAL,
    createdBy: 'system',
    lastModifiedBy: 'system',
    personalInfo: {
      firstName: 'Jane',
      lastName: 'Smith',
      phoneNumber: '555-0456',
      email: 'jane.smith@example.com',
      gender: Gender.FEMALE,
      address: {
        street: '456 Oak Ave',
        city: 'Somewhere',
        state: 'NY',
        zipCode: '67890',
        country: 'USA'
      }
    },
    crisisDetails: {
      description: 'Domestic violence incident requiring immediate intervention',
      location: '456 Oak Ave, Somewhere, NY',
      dateTime: new Date(Date.now() - 86400000), // 1 day ago
      witnesses: [],
      involvedParties: ['spouse'],
      riskFactors: ['history of violence', 'escalating threats'],
      immediateNeeds: ['safety planning', 'legal assistance', 'shelter']
    },
    assessment: {
      riskLevel: RiskLevel.IMMINENT,
      emotionalState: ['fearful', 'anxious'],
      cognitiveState: 'Alert and cooperative',
      physicalCondition: 'Minor injuries reported',
      socialSupport: 'Isolated from family and friends',
      copingMechanisms: [],
      strengths: ['seeking help', 'protective of children'],
      concerns: ['immediate safety', 'escalating violence'],
      recommendations: ['immediate safety planning', 'legal protection order', 'shelter placement']
    },
    actions: []
  },
  {
    caseNumber: 'CASE-2025-003',
    crisisType: CrisisType.SUBSTANCE_ABUSE,
    status: CaseStatus.RESOLVED,
    priority: Priority.MEDIUM,
    createdBy: 'system',
    lastModifiedBy: 'system',
    personalInfo: {
      firstName: 'Mike',
      lastName: 'Johnson',
      phoneNumber: '555-0789',
      email: 'mike.johnson@example.com',
      gender: Gender.MALE,
      address: {
        street: '789 Pine St',
        city: 'Elsewhere',
        state: 'TX',
        zipCode: '54321',
        country: 'USA'
      }
    },
    crisisDetails: {
      description: 'Substance abuse crisis with overdose risk',
      location: '789 Pine St, Elsewhere, TX',
      dateTime: new Date(Date.now() - 172800000), // 2 days ago
      witnesses: ['neighbor'],
      involvedParties: [],
      riskFactors: ['history of substance abuse', 'recent relapse'],
      immediateNeeds: ['medical evaluation', 'detox services']
    },
    assessment: {
      riskLevel: RiskLevel.MODERATE,
      emotionalState: ['depressed', 'hopeless'],
      cognitiveState: 'Impaired due to substance use',
      physicalCondition: 'Requires medical monitoring',
      socialSupport: 'Some family support available',
      copingMechanisms: ['previously attended AA'],
      strengths: ['history of recovery', 'family support'],
      concerns: ['relapse risk', 'medical complications'],
      recommendations: ['inpatient detox', 'substance abuse counseling', 'family therapy']
    },
    actions: []
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing data
    await CaseRecord.deleteMany({});
    console.log('Cleared existing case records');

    // Insert sample data
    const createdCases = await CaseRecord.insertMany(sampleCases);
    console.log(`Created ${createdCases.length} sample cases`);

    // Display created cases
    createdCases.forEach((caseRecord, index) => {
      console.log(`${index + 1}. ${caseRecord.caseNumber} - ${caseRecord.crisisType} (${caseRecord.status})`);
    });

    console.log('\n✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedDatabase();
