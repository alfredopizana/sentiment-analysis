// Test setup file
import { config } from '../config/config';

// Override config for testing
config.server.nodeEnv = 'test';
config.logging.level = 'error'; // Reduce log noise during tests
config.analysis.intervalMs = 100; // Faster processing for tests

// Mock external services
jest.mock('axios');
jest.mock('twilio');

// Global test utilities
global.createMockConversationSession = () => ({
  id: 'test-session-123',
  platformType: 'websocket',
  platformSessionId: 'ws-123',
  startTime: new Date(),
  status: 'active',
  participants: [
    {
      id: 'caller-123',
      type: 'caller',
      name: 'Test Caller',
      phoneNumber: '+1234567890'
    }
  ],
  messages: [],
  metadata: {}
});

global.createMockMessage = (content: string, speaker: 'caller' | 'agent' = 'caller') => ({
  id: `msg-${Date.now()}`,
  conversationId: 'test-session-123',
  timestamp: new Date(),
  speaker,
  content,
  metadata: {}
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
