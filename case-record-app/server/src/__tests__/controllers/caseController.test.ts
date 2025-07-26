import request from 'supertest';
import express from 'express';
import { CaseRecord } from '../../models/CaseRecord';
import { caseController } from '../../controllers/caseController';
import { CrisisType, Priority, RiskLevel, CaseStatus } from '../../types';

const app = express();
app.use(express.json());

// Mock routes for testing
app.get('/cases', caseController.getCases.bind(caseController));
app.post('/cases', caseController.createCase.bind(caseController));
app.get('/cases/:id', caseController.getCaseById.bind(caseController));
app.put('/cases/:id', caseController.updateCase.bind(caseController));
app.delete('/cases/:id', caseController.deleteCase.bind(caseController));
app.post('/cases/:id/analyze', caseController.analyzeCase.bind(caseController));

describe('CaseController', () => {
  const mockCaseData = {
    caseNumber: 'CR-2025-000001', // Add case number for tests
    crisisType: CrisisType.MENTAL_HEALTH,
    priority: Priority.HIGH,
    createdBy: 'test-user',
    lastModifiedBy: 'test-user',
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '555-0123',
      email: 'john.doe@example.com'
    },
    crisisDetails: {
      description: 'Individual expressing suicidal thoughts and appears distressed',
      location: '123 Main St, City, State',
      dateTime: new Date(),
      riskFactors: ['suicidal ideation', 'social isolation'],
      immediateNeeds: ['safety assessment', 'mental health evaluation'],
      mentalHealthDetails: {
        suicidalIdeation: true,
        selfHarmRisk: true,
        previousAttempts: false,
        mentalHealthHistory: 'History of depression and anxiety'
      }
    },
    assessment: {
      riskLevel: RiskLevel.HIGH,
      emotionalState: ['anxious', 'depressed'],
      cognitiveState: 'Alert but distressed',
      recommendations: ['Immediate psychiatric evaluation', 'Safety planning']
    },
    actions: []
  };

  describe('POST /cases', () => {
    it('should create a new case successfully', async () => {
      const response = await request(app)
        .post('/cases')
        .send(mockCaseData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('caseNumber');
      expect(response.body.data.personalInfo.firstName).toBe('John');
      expect(response.body.data.crisisType).toBe(CrisisType.MENTAL_HEALTH);
    });

    it('should generate a unique case number', async () => {
      const response1 = await request(app)
        .post('/cases')
        .send(mockCaseData);

      const response2 = await request(app)
        .post('/cases')
        .send({
          ...mockCaseData,
          personalInfo: { ...mockCaseData.personalInfo, firstName: 'Jane' }
        });

      expect(response1.body.data.caseNumber).not.toBe(response2.body.data.caseNumber);
    });
  });

  describe('GET /cases', () => {
    beforeEach(async () => {
      // Create test cases
      await CaseRecord.create(mockCaseData);
      await CaseRecord.create({
        ...mockCaseData,
        crisisType: CrisisType.DOMESTIC_VIOLENCE,
        priority: Priority.CRITICAL,
        personalInfo: { ...mockCaseData.personalInfo, firstName: 'Jane' }
      });
    });

    it('should return paginated cases', async () => {
      const response = await request(app)
        .get('/cases?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      });
    });

    it('should filter cases by crisis type', async () => {
      const response = await request(app)
        .get(`/cases?crisisType=${CrisisType.MENTAL_HEALTH}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].crisisType).toBe(CrisisType.MENTAL_HEALTH);
    });

    it('should search cases by name', async () => {
      const response = await request(app)
        .get('/cases?search=Jane')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].personalInfo.firstName).toBe('Jane');
    });
  });

  describe('GET /cases/:id', () => {
    let caseId: string;

    beforeEach(async () => {
      const caseRecord = await CaseRecord.create(mockCaseData);
      caseId = (caseRecord._id as any).toString();
    });

    it('should return a specific case', async () => {
      const response = await request(app)
        .get(`/cases/${caseId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(caseId);
      expect(response.body.data.personalInfo.firstName).toBe('John');
    });

    it('should return 404 for non-existent case', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/cases/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Case not found');
    });
  });

  describe('PUT /cases/:id', () => {
    let caseId: string;

    beforeEach(async () => {
      const caseRecord = await CaseRecord.create(mockCaseData);
      caseId = (caseRecord._id as any).toString();
    });

    it('should update a case successfully', async () => {
      const updateData = {
        status: CaseStatus.IN_PROGRESS,
        lastModifiedBy: 'updated-user',
        assessment: {
          ...mockCaseData.assessment,
          riskLevel: RiskLevel.MODERATE
        }
      };

      const response = await request(app)
        .put(`/cases/${caseId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(CaseStatus.IN_PROGRESS);
      expect(response.body.data.assessment.riskLevel).toBe(RiskLevel.MODERATE);
    });

    it('should track field updates', async () => {
      const updateData = {
        status: CaseStatus.RESOLVED,
        lastModifiedBy: 'updated-user'
      };

      const response = await request(app)
        .put(`/cases/${caseId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.fieldUpdates).toBeDefined();
      expect(response.body.data.fieldUpdates.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /cases/:id', () => {
    let caseId: string;

    beforeEach(async () => {
      const caseRecord = await CaseRecord.create(mockCaseData);
      caseId = (caseRecord._id as any).toString();
    });

    it('should delete a case successfully', async () => {
      const response = await request(app)
        .delete(`/cases/${caseId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Case deleted successfully');

      // Verify case is deleted
      const deletedCase = await CaseRecord.findById(caseId);
      expect(deletedCase).toBeNull();
    });

    it('should return 404 for non-existent case', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/cases/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Case not found');
    });
  });

  describe('POST /cases/:id/analyze', () => {
    let caseId: string;

    beforeEach(async () => {
      const caseRecord = await CaseRecord.create(mockCaseData);
      caseId = (caseRecord._id as any).toString();
    });

    it('should analyze a case with sentiment analysis', async () => {
      const response = await request(app)
        .post(`/cases/${caseId}/analyze`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assessment.sentimentScore).toBeDefined();
      expect(response.body.data.fieldUpdates).toBeDefined();
      
      // Check if AI updates are tracked
      const aiUpdates = response.body.data.fieldUpdates.filter(
        (update: any) => update.updatedBy === 'ai_sentiment_analysis'
      );
      expect(aiUpdates.length).toBeGreaterThan(0);
    });
  });
});
