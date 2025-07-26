import { ConversationAnalysisService } from '../../services/ConversationAnalysisService';
import { ConversationSession, RiskLevel, CrisisType } from '../../types';

describe('ConversationAnalysisService', () => {
  let service: ConversationAnalysisService;
  let mockSession: ConversationSession;

  beforeEach(() => {
    service = new ConversationAnalysisService();
    mockSession = (global as any).createMockConversationSession();
  });

  describe('analyzeConversation', () => {
    it('should analyze conversation with no messages', async () => {
      const analysis = await service.analyzeConversation(mockSession);

      expect(analysis).toBeDefined();
      expect(analysis.overallSentiment).toBe(0);
      expect(analysis.riskLevel).toBe(RiskLevel.LOW);
      expect(analysis.crisisIndicators).toHaveLength(0);
      expect(analysis.sentimentTrend).toHaveLength(0);
    });

    it('should detect suicide risk indicators', async () => {
      mockSession.messages = [
        (global as any).createMockMessage('I want to kill myself'),
        (global as any).createMockMessage('Life is not worth living anymore')
      ];

      const analysis = await service.analyzeConversation(mockSession);

      expect(analysis.crisisIndicators).toHaveLength(1);
      expect(analysis.crisisIndicators[0].type).toBe(CrisisType.SUICIDE_RISK);
      expect(analysis.riskLevel).toBe(RiskLevel.IMMINENT);
      expect(analysis.recommendedActions).toContain('IMMEDIATE INTERVENTION REQUIRED');
    });

    it('should detect domestic violence indicators', async () => {
      mockSession.messages = [
        (global as any).createMockMessage('He hits me when he drinks'),
        (global as any).createMockMessage('I am scared of him')
      ];

      const analysis = await service.analyzeConversation(mockSession);

      expect(analysis.crisisIndicators.some(ci => ci.type === CrisisType.DOMESTIC_VIOLENCE)).toBe(true);
      expect(analysis.riskLevel).toBeOneOf([RiskLevel.MODERATE, RiskLevel.HIGH]);
    });

    it('should analyze sentiment trend', async () => {
      mockSession.messages = [
        (global as any).createMockMessage('I feel terrible'),
        (global as any).createMockMessage('Everything is going wrong'),
        (global as any).createMockMessage('I feel a bit better now')
      ];

      const analysis = await service.analyzeConversation(mockSession);

      expect(analysis.sentimentTrend).toHaveLength(3);
      expect(analysis.sentimentTrend[0].sentiment).toBeLessThan(0);
      expect(analysis.sentimentTrend[2].sentiment).toBeGreaterThan(analysis.sentimentTrend[1].sentiment);
    });

    it('should extract emotional states', async () => {
      mockSession.messages = [
        (global as any).createMockMessage('I am so anxious and scared'),
        (global as any).createMockMessage('I feel hopeless and depressed')
      ];

      const analysis = await service.analyzeConversation(mockSession);

      expect(analysis.emotionalStates.length).toBeGreaterThan(0);
      expect(analysis.emotionalStates.some(es => es.emotion === 'anxiety')).toBe(true);
      expect(analysis.emotionalStates.some(es => es.emotion === 'fear')).toBe(true);
    });

    it('should generate appropriate recommendations', async () => {
      mockSession.messages = [
        (global as any).createMockMessage('I want to hurt someone'),
        (global as any).createMockMessage('I have a weapon')
      ];

      const analysis = await service.analyzeConversation(mockSession);

      expect(analysis.recommendedActions).toContain('IMMEDIATE INTERVENTION REQUIRED');
      expect(analysis.recommendedActions).toContain('Contact emergency services');
    });

    it('should calculate confidence scores', async () => {
      mockSession.messages = [
        (global as any).createMockMessage('I feel sad'),
        (global as any).createMockMessage('Things are not going well')
      ];

      const analysis = await service.analyzeConversation(mockSession);

      expect(analysis.confidence).toBeGreaterThan(0);
      expect(analysis.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle processing errors gracefully', async () => {
      // Mock a service that throws an error
      const originalAnalyze = service['analyzeSingleMessage'];
      service['analyzeSingleMessage'] = jest.fn().mockRejectedValue(new Error('API Error'));

      mockSession.messages = [
        (global as any).createMockMessage('Test message')
      ];

      const analysis = await service.analyzeConversation(mockSession);

      expect(analysis).toBeDefined();
      expect(analysis.confidence).toBeLessThan(1); // Should use fallback
    });
  });
});

// Custom Jest matcher
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});
