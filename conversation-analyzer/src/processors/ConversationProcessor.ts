import { EventEmitter } from 'eventemitter3';
import { 
  ConversationSession, 
  ConversationMessage, 
  ProcessingResult,
  ProcessingAction,
  ActionType,
  RiskLevel,
  ConversationStatus
} from '../types';
import { ConversationAnalysisService } from '../services/ConversationAnalysisService';
import { CaseRecordService } from '../services/CaseRecordService';
import { config } from '../config/config';
import { createLogger } from '../utils/logger';

export class ConversationProcessor extends EventEmitter {
  private logger = createLogger('ConversationProcessor');
  private analysisService: ConversationAnalysisService;
  private caseRecordService: CaseRecordService;
  private processingQueue = new Map<string, NodeJS.Timeout>();
  private processedSessions = new Set<string>();

  constructor() {
    super();
    this.analysisService = new ConversationAnalysisService();
    this.caseRecordService = new CaseRecordService();
  }

  async processConversation(session: ConversationSession): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Processing conversation', { 
        sessionId: session.id,
        messageCount: session.messages.length,
        status: session.status
      });

      // Skip if already processed recently
      if (this.processedSessions.has(session.id)) {
        this.logger.debug('Conversation already processed recently', { sessionId: session.id });
        return this.createEmptyResult(session.id);
      }

      // Analyze the conversation
      const analysis = await this.analysisService.analyzeConversation(session);
      
      // Update session with analysis
      session.analysis = analysis;
      
      // Determine actions based on analysis
      const actions = await this.determineActions(session, analysis);
      
      // Execute actions
      const executedActions = await this.executeActions(session, actions);
      
      // Create processing result
      const result: ProcessingResult = {
        conversationId: session.id,
        analysis,
        actions: executedActions,
        caseCreated: executedActions.some(a => a.type === ActionType.CREATE_CASE && a.executed),
        caseUpdated: executedActions.some(a => a.type === ActionType.UPDATE_CASE && a.executed),
        errors: executedActions.filter(a => a.error).map(a => a.error!)
      };

      // Mark as processed
      this.processedSessions.add(session.id);
      
      // Clean up processed sessions after some time
      setTimeout(() => {
        this.processedSessions.delete(session.id);
      }, 300000); // 5 minutes

      const processingTime = Date.now() - startTime;
      this.logger.info('Conversation processing completed', {
        sessionId: session.id,
        processingTime,
        riskLevel: analysis.riskLevel,
        actionsExecuted: executedActions.filter(a => a.executed).length,
        caseCreated: result.caseCreated,
        caseUpdated: result.caseUpdated
      });

      // Emit processing result
      this.emit('processing:completed', result, session);
      
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error('Error processing conversation', {
        sessionId: session.id,
        processingTime,
        error: (error as Error).message
      });

      const result: ProcessingResult = {
        conversationId: session.id,
        analysis: session.analysis || this.createEmptyAnalysis(),
        actions: [],
        errors: [(error as Error).message]
      };

      this.emit('processing:error', error, session);
      return result;
    }
  }

  async processMessage(session: ConversationSession, message: ConversationMessage): Promise<void> {
    // Only process caller messages for real-time analysis
    if (message.speaker !== 'caller') {
      return;
    }

    this.logger.debug('Processing new message', {
      sessionId: session.id,
      messageId: message.id,
      contentLength: message.content.length
    });

    // Cancel any pending processing for this session
    const existingTimeout = this.processingQueue.get(session.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule processing with debounce
    const timeout = setTimeout(async () => {
      try {
        await this.processConversation(session);
        this.processingQueue.delete(session.id);
      } catch (error) {
        this.logger.error('Error in scheduled processing', {
          sessionId: session.id,
          error: (error as Error).message
        });
      }
    }, config.analysis.intervalMs);

    this.processingQueue.set(session.id, timeout);

    // Emit real-time message event
    this.emit('message:processed', message, session);
  }

  async processSessionEnd(session: ConversationSession): Promise<ProcessingResult> {
    this.logger.info('Processing session end', { sessionId: session.id });

    // Cancel any pending processing
    const existingTimeout = this.processingQueue.get(session.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.processingQueue.delete(session.id);
    }

    // Force final processing
    this.processedSessions.delete(session.id); // Allow reprocessing
    const result = await this.processConversation(session);

    this.emit('session:processed', result, session);
    return result;
  }

  private async determineActions(
    session: ConversationSession, 
    analysis: any
  ): Promise<ProcessingAction[]> {
    const actions: ProcessingAction[] = [];

    // Auto case creation based on configuration and risk level
    if (config.analysis.autoCaseCreation) {
      if (analysis.riskLevel === RiskLevel.IMMINENT || analysis.riskLevel === RiskLevel.HIGH) {
        actions.push({
          type: ActionType.CREATE_CASE,
          description: 'Auto-create case due to high risk level',
          priority: analysis.riskLevel === RiskLevel.IMMINENT ? 'critical' : 'high',
          automated: true,
          executed: false
        });
      } else if (analysis.crisisIndicators.length > 0) {
        actions.push({
          type: ActionType.CREATE_CASE,
          description: 'Auto-create case due to crisis indicators',
          priority: 'medium',
          automated: true,
          executed: false
        });
      }
    }

    // Update existing case if one exists
    if (session.caseId) {
      actions.push({
        type: ActionType.UPDATE_CASE,
        description: 'Update existing case with new analysis',
        priority: 'medium',
        automated: true,
        executed: false
      });
    }

    // Alert supervisor for high-risk situations
    if (analysis.riskLevel === RiskLevel.IMMINENT) {
      actions.push({
        type: ActionType.ALERT_SUPERVISOR,
        description: 'Alert supervisor - imminent risk detected',
        priority: 'critical',
        automated: true,
        executed: false
      });
    }

    // Escalate call for high-risk situations
    if (analysis.riskLevel === RiskLevel.HIGH || analysis.riskLevel === RiskLevel.IMMINENT) {
      actions.push({
        type: ActionType.ESCALATE_CALL,
        description: 'Escalate call to crisis specialist',
        priority: 'high',
        automated: false, // Requires human decision
        executed: false
      });
    }

    // Schedule follow-up for moderate to high risk
    if (analysis.riskLevel !== RiskLevel.LOW) {
      actions.push({
        type: ActionType.SCHEDULE_FOLLOWUP,
        description: 'Schedule follow-up based on risk level',
        priority: analysis.riskLevel === RiskLevel.HIGH ? 'high' : 'medium',
        automated: true,
        executed: false
      });
    }

    return actions;
  }

  private async executeActions(
    session: ConversationSession, 
    actions: ProcessingAction[]
  ): Promise<ProcessingAction[]> {
    const executedActions: ProcessingAction[] = [];

    for (const action of actions) {
      try {
        this.logger.info('Executing action', {
          sessionId: session.id,
          actionType: action.type,
          automated: action.automated
        });

        let executed = false;
        let result: any = null;

        switch (action.type) {
          case ActionType.CREATE_CASE:
            if (session.analysis) {
              const caseResult = await this.caseRecordService.createCaseFromConversation(
                session, 
                session.analysis
              );
              if (caseResult) {
                session.caseId = caseResult.caseId;
                result = caseResult;
                executed = true;
              }
            }
            break;

          case ActionType.UPDATE_CASE:
            if (session.caseId && session.analysis) {
              executed = await this.caseRecordService.updateCaseWithAnalysis(
                session.caseId,
                session,
                session.analysis
              );
            }
            break;

          case ActionType.ALERT_SUPERVISOR:
            // In a real implementation, this would send alerts via email, SMS, etc.
            this.emit('supervisor:alert', {
              sessionId: session.id,
              riskLevel: session.analysis?.riskLevel,
              message: 'Imminent risk detected in conversation'
            });
            executed = true;
            break;

          case ActionType.ESCALATE_CALL:
            // This would typically integrate with call routing systems
            this.emit('call:escalate', {
              sessionId: session.id,
              reason: 'High risk situation detected'
            });
            executed = true;
            break;

          case ActionType.SCHEDULE_FOLLOWUP:
            // This would integrate with scheduling systems
            this.emit('followup:schedule', {
              sessionId: session.id,
              riskLevel: session.analysis?.riskLevel,
              recommendedTimeframe: this.getFollowupTimeframe(session.analysis?.riskLevel)
            });
            executed = true;
            break;

          case ActionType.SEND_RESOURCES:
            // This would send relevant resources to the caller
            this.emit('resources:send', {
              sessionId: session.id,
              crisisType: session.analysis?.crisisIndicators[0]?.type
            });
            executed = true;
            break;

          default:
            this.logger.warn('Unknown action type', { actionType: action.type });
        }

        executedActions.push({
          ...action,
          executed,
          executedAt: executed ? new Date() : undefined,
          result
        });

        if (executed) {
          this.logger.info('Action executed successfully', {
            sessionId: session.id,
            actionType: action.type
          });
        }

      } catch (error) {
        this.logger.error('Error executing action', {
          sessionId: session.id,
          actionType: action.type,
          error: (error as Error).message
        });

        executedActions.push({
          ...action,
          executed: false,
          error: (error as Error).message
        });
      }
    }

    return executedActions;
  }

  private getFollowupTimeframe(riskLevel?: RiskLevel): string {
    switch (riskLevel) {
      case RiskLevel.IMMINENT:
        return '1 hour';
      case RiskLevel.HIGH:
        return '4 hours';
      case RiskLevel.MODERATE:
        return '24 hours';
      default:
        return '72 hours';
    }
  }

  private createEmptyResult(conversationId: string): ProcessingResult {
    return {
      conversationId,
      analysis: this.createEmptyAnalysis(),
      actions: []
    };
  }

  private createEmptyAnalysis(): any {
    return {
      overallSentiment: 0,
      sentimentTrend: [],
      crisisIndicators: [],
      keyPhrases: [],
      emotionalStates: [],
      riskLevel: RiskLevel.LOW,
      recommendedActions: [],
      confidence: 0,
      processingTime: 0,
      lastAnalyzedAt: new Date()
    };
  }

  // Public methods for external control
  async forceProcessSession(sessionId: string, session: ConversationSession): Promise<ProcessingResult> {
    this.processedSessions.delete(sessionId); // Allow reprocessing
    return this.processConversation(session);
  }

  cancelProcessing(sessionId: string): void {
    const timeout = this.processingQueue.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.processingQueue.delete(sessionId);
      this.logger.info('Processing cancelled', { sessionId });
    }
  }

  getProcessingStatus(): { queueSize: number; processedCount: number } {
    return {
      queueSize: this.processingQueue.size,
      processedCount: this.processedSessions.size
    };
  }

  // Cleanup method
  cleanup(): void {
    // Clear all pending timeouts
    this.processingQueue.forEach(timeout => clearTimeout(timeout));
    this.processingQueue.clear();
    this.processedSessions.clear();
    this.removeAllListeners();
    
    this.logger.info('Conversation processor cleaned up');
  }
}
