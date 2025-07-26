import axios, { AxiosInstance } from 'axios';
import { 
  ConversationSession, 
  ConversationAnalysis, 
  CaseRecordPayload,
  CrisisType,
  RiskLevel,
  Priority
} from '../types';
import { config } from '../config/config';
import { createLogger } from '../utils/logger';

export class CaseRecordService {
  private logger = createLogger('CaseRecordService');
  private apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create({
      baseURL: config.caseRecordApi.url,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.caseRecordApi.apiKey}`
      }
    });

    // Add response interceptor for error handling
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error('Case Record API error', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  async createCaseFromConversation(
    session: ConversationSession, 
    analysis: ConversationAnalysis
  ): Promise<{ caseId: string; caseNumber: string } | null> {
    try {
      this.logger.info('Creating case from conversation', { 
        sessionId: session.id,
        riskLevel: analysis.riskLevel,
        crisisIndicators: analysis.crisisIndicators.length
      });

      const casePayload = this.buildCasePayload(session, analysis);
      
      const response = await this.apiClient.post('/cases', casePayload);
      
      if (response.data.success) {
        const caseData = response.data.data;
        
        this.logger.info('Case created successfully', {
          sessionId: session.id,
          caseId: caseData._id,
          caseNumber: caseData.caseNumber
        });

        return {
          caseId: caseData._id,
          caseNumber: caseData.caseNumber
        };
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to create case from conversation', {
        sessionId: session.id,
        error: (error as Error).message
      });
      return null;
    }
  }

  async updateCaseWithAnalysis(
    caseId: string, 
    session: ConversationSession, 
    analysis: ConversationAnalysis
  ): Promise<boolean> {
    try {
      this.logger.info('Updating case with new analysis', { 
        caseId,
        sessionId: session.id 
      });

      const updatePayload = this.buildUpdatePayload(session, analysis);
      
      const response = await this.apiClient.put(`/cases/${caseId}`, updatePayload);
      
      if (response.data.success) {
        this.logger.info('Case updated successfully', { caseId, sessionId: session.id });
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Failed to update case', {
        caseId,
        sessionId: session.id,
        error: (error as Error).message
      });
      return false;
    }
  }

  async triggerCaseAnalysis(caseId: string): Promise<boolean> {
    try {
      this.logger.info('Triggering case analysis', { caseId });
      
      const response = await this.apiClient.post(`/cases/${caseId}/analyze`);
      
      if (response.data.success) {
        this.logger.info('Case analysis triggered successfully', { caseId });
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Failed to trigger case analysis', {
        caseId,
        error: (error as Error).message
      });
      return false;
    }
  }

  async getCaseById(caseId: string): Promise<any | null> {
    try {
      const response = await this.apiClient.get(`/cases/${caseId}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to get case', {
        caseId,
        error: (error as Error).message
      });
      return null;
    }
  }

  async searchCasesByPhone(phoneNumber: string): Promise<any[]> {
    try {
      const response = await this.apiClient.get('/cases', {
        params: {
          search: phoneNumber,
          limit: 10
        }
      });
      
      if (response.data.success) {
        return response.data.data || [];
      }
      
      return [];
    } catch (error) {
      this.logger.error('Failed to search cases by phone', {
        phoneNumber,
        error: (error as Error).message
      });
      return [];
    }
  }

  private buildCasePayload(session: ConversationSession, analysis: ConversationAnalysis): CaseRecordPayload {
    const primaryCrisisType = this.determinePrimaryCrisisType(analysis);
    const priority = this.mapRiskToPriority(analysis.riskLevel);
    const caller = session.participants.find(p => p.type === 'caller');
    
    // Extract conversation summary
    const conversationSummary = this.generateConversationSummary(session, analysis);
    
    return {
      crisisType: primaryCrisisType,
      priority,
      createdBy: 'conversation-analyzer',
      lastModifiedBy: 'conversation-analyzer',
      personalInfo: {
        firstName: caller?.name?.split(' ')[0] || 'Unknown',
        lastName: caller?.name?.split(' ').slice(1).join(' ') || 'Caller',
        phoneNumber: caller?.phoneNumber,
        email: caller?.email
      },
      crisisDetails: {
        description: conversationSummary,
        location: session.metadata.location || 'Phone call',
        dateTime: session.startTime,
        riskFactors: analysis.crisisIndicators.map(ci => ci.description),
        immediateNeeds: this.extractImmediateNeeds(analysis)
      },
      assessment: {
        riskLevel: analysis.riskLevel.toLowerCase(),
        sentimentScore: analysis.overallSentiment,
        emotionalState: analysis.emotionalStates.map(es => es.emotion),
        recommendations: analysis.recommendedActions
      },
      actions: this.generateInitialActions(analysis)
    };
  }

  private buildUpdatePayload(session: ConversationSession, analysis: ConversationAnalysis): any {
    const conversationSummary = this.generateConversationSummary(session, analysis);
    
    return {
      lastModifiedBy: 'conversation-analyzer',
      crisisDetails: {
        description: conversationSummary,
        riskFactors: analysis.crisisIndicators.map(ci => ci.description),
        immediateNeeds: this.extractImmediateNeeds(analysis)
      },
      assessment: {
        riskLevel: analysis.riskLevel.toLowerCase(),
        sentimentScore: analysis.overallSentiment,
        emotionalState: analysis.emotionalStates.map(es => es.emotion),
        recommendations: analysis.recommendedActions
      }
    };
  }

  private determinePrimaryCrisisType(analysis: ConversationAnalysis): string {
    if (analysis.crisisIndicators.length === 0) {
      return CrisisType.GENERAL_EMERGENCY;
    }
    
    // Sort by severity and confidence
    const sortedIndicators = analysis.crisisIndicators.sort((a, b) => 
      (b.severity * b.confidence) - (a.severity * a.confidence)
    );
    
    const primaryIndicator = sortedIndicators[0];
    
    // Map internal crisis types to case record crisis types
    const crisisTypeMapping = {
      [CrisisType.SUICIDE_RISK]: CrisisType.MENTAL_HEALTH,
      [CrisisType.VIOLENCE_THREAT]: CrisisType.DOMESTIC_VIOLENCE,
      [CrisisType.MENTAL_HEALTH]: CrisisType.MENTAL_HEALTH,
      [CrisisType.DOMESTIC_VIOLENCE]: CrisisType.DOMESTIC_VIOLENCE,
      [CrisisType.SUBSTANCE_ABUSE]: CrisisType.SUBSTANCE_ABUSE,
      [CrisisType.CHILD_WELFARE]: CrisisType.CHILD_WELFARE,
      [CrisisType.ELDER_ABUSE]: CrisisType.ELDER_ABUSE,
      [CrisisType.GENERAL_EMERGENCY]: CrisisType.GENERAL_EMERGENCY
    };
    
    return crisisTypeMapping[primaryIndicator.type] || CrisisType.GENERAL_EMERGENCY;
  }

  private mapRiskToPriority(riskLevel: RiskLevel): string {
    const riskToPriorityMap = {
      [RiskLevel.LOW]: Priority.LOW,
      [RiskLevel.MODERATE]: Priority.MEDIUM,
      [RiskLevel.HIGH]: Priority.HIGH,
      [RiskLevel.IMMINENT]: Priority.CRITICAL
    };
    
    return riskToPriorityMap[riskLevel] || Priority.MEDIUM;
  }

  private generateConversationSummary(session: ConversationSession, analysis: ConversationAnalysis): string {
    const callerMessages = session.messages.filter(m => m.speaker === 'caller');
    const totalMessages = callerMessages.length;
    const duration = session.endTime 
      ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000 / 60)
      : 'ongoing';
    
    let summary = `Phone conversation analysis (${totalMessages} messages, ${duration} minutes).\n\n`;
    
    // Add crisis indicators
    if (analysis.crisisIndicators.length > 0) {
      summary += 'CRISIS INDICATORS DETECTED:\n';
      analysis.crisisIndicators.forEach(indicator => {
        summary += `- ${indicator.description} (severity: ${Math.round(indicator.severity * 100)}%)\n`;
      });
      summary += '\n';
    }
    
    // Add emotional state
    if (analysis.emotionalStates.length > 0) {
      summary += 'EMOTIONAL STATE:\n';
      analysis.emotionalStates.slice(0, 3).forEach(emotion => {
        summary += `- ${emotion.emotion} (intensity: ${Math.round(emotion.intensity * 100)}%)\n`;
      });
      summary += '\n';
    }
    
    // Add key conversation excerpts
    const significantMessages = callerMessages
      .filter(m => m.content.length > 20)
      .slice(-3); // Last 3 significant messages
    
    if (significantMessages.length > 0) {
      summary += 'KEY CONVERSATION EXCERPTS:\n';
      significantMessages.forEach((message, index) => {
        const timestamp = message.timestamp.toLocaleTimeString();
        summary += `[${timestamp}] "${message.content}"\n`;
      });
      summary += '\n';
    }
    
    // Add sentiment trend
    if (analysis.sentimentTrend.length > 0) {
      const avgSentiment = analysis.overallSentiment;
      const sentimentLabel = avgSentiment > 0.2 ? 'Positive' : 
                           avgSentiment < -0.2 ? 'Negative' : 'Neutral';
      summary += `OVERALL SENTIMENT: ${sentimentLabel} (${avgSentiment.toFixed(2)})\n`;
    }
    
    return summary.trim();
  }

  private extractImmediateNeeds(analysis: ConversationAnalysis): string[] {
    const needs: string[] = [];
    
    // Risk-based needs
    switch (analysis.riskLevel) {
      case RiskLevel.IMMINENT:
        needs.push('Immediate safety intervention');
        needs.push('Emergency services contact');
        break;
      case RiskLevel.HIGH:
        needs.push('Urgent mental health evaluation');
        needs.push('Safety planning');
        break;
      case RiskLevel.MODERATE:
        needs.push('Follow-up within 24 hours');
        needs.push('Resource referrals');
        break;
    }
    
    // Crisis-specific needs
    analysis.crisisIndicators.forEach(indicator => {
      switch (indicator.type) {
        case CrisisType.SUICIDE_RISK:
          needs.push('Suicide risk assessment');
          needs.push('Crisis counseling');
          break;
        case CrisisType.DOMESTIC_VIOLENCE:
          needs.push('Safety planning');
          needs.push('Legal advocacy');
          break;
        case CrisisType.SUBSTANCE_ABUSE:
          needs.push('Medical evaluation');
          needs.push('Addiction counseling');
          break;
      }
    });
    
    // Emotional needs
    const dominantEmotion = analysis.emotionalStates[0];
    if (dominantEmotion) {
      switch (dominantEmotion.emotion) {
        case 'anxiety':
          needs.push('Anxiety management support');
          break;
        case 'despair':
          needs.push('Hope and coping resources');
          break;
        case 'anger':
          needs.push('Anger management resources');
          break;
      }
    }
    
    return [...new Set(needs)]; // Remove duplicates
  }

  private generateInitialActions(analysis: ConversationAnalysis): any[] {
    const actions: any[] = [];
    
    // High-priority actions for imminent risk
    if (analysis.riskLevel === RiskLevel.IMMINENT) {
      actions.push({
        type: 'immediate_response',
        description: 'Contact emergency services immediately',
        assignedTo: 'Crisis Team',
        priority: 'critical',
        status: 'pending'
      });
    }
    
    // Follow-up actions
    if (analysis.riskLevel === RiskLevel.HIGH || analysis.riskLevel === RiskLevel.IMMINENT) {
      actions.push({
        type: 'follow_up',
        description: 'Schedule follow-up call within 2 hours',
        assignedTo: 'Crisis Counselor',
        priority: 'high',
        status: 'pending'
      });
    }
    
    // Resource coordination
    if (analysis.crisisIndicators.length > 0) {
      actions.push({
        type: 'resource_coordination',
        description: 'Connect caller with appropriate crisis resources',
        assignedTo: 'Resource Coordinator',
        priority: 'medium',
        status: 'pending'
      });
    }
    
    return actions;
  }

  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }> {
    try {
      const response = await this.apiClient.get('/health');
      
      return {
        healthy: response.status === 200,
        details: {
          apiConnected: true,
          responseTime: response.headers['x-response-time'] || 'unknown',
          apiUrl: config.caseRecordApi.url
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          apiConnected: false,
          error: (error as Error).message,
          apiUrl: config.caseRecordApi.url
        }
      };
    }
  }
}
